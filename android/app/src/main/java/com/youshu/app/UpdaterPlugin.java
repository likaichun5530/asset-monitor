package com.youshu.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {
    private static final String UPDATE_HOST = "asset.kenny5530.asia";

    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionName", info.versionName);
            result.put("versionCode", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode);
            result.put("canInstallPackages", canInstallPackages());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("无法读取当前版本", error);
        }
    }

    @PluginMethod
    public void openInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || canInstallPackages()) {
            call.resolve();
            return;
        }
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String source = call.getString("url");
        String expectedSha256 = call.getString("sha256", "").toLowerCase(Locale.ROOT);
        if (source == null || expectedSha256.length() != 64) {
            call.reject("升级信息不完整");
            return;
        }
        if (!canInstallPackages()) {
            call.reject("请先允许有数安装未知应用", "INSTALL_PERMISSION_REQUIRED");
            return;
        }

        new Thread(() -> downloadAndInstall(call, source, expectedSha256)).start();
    }

    private void downloadAndInstall(PluginCall call, String source, String expectedSha256) {
        HttpURLConnection connection = null;
        File output = null;
        try {
            URL url = new URL(source);
            if (!"https".equalsIgnoreCase(url.getProtocol()) || !UPDATE_HOST.equalsIgnoreCase(url.getHost())) {
                throw new IllegalArgumentException("升级地址不受信任");
            }

            File updateDirectory = new File(getContext().getCacheDir(), "updates");
            if (!updateDirectory.exists() && !updateDirectory.mkdirs()) throw new IllegalStateException("无法创建升级目录");
            output = new File(updateDirectory, "youshu-update.apk");

            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setUseCaches(false);
            connection.connect();
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                throw new IllegalStateException("下载失败：HTTP " + connection.getResponseCode());
            }

            long total = connection.getContentLengthLong();
            long downloaded = 0;
            int lastProgress = -1;
            try (InputStream input = connection.getInputStream(); FileOutputStream file = new FileOutputStream(output)) {
                byte[] buffer = new byte[64 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    file.write(buffer, 0, count);
                    downloaded += count;
                    int progress = total > 0 ? (int) Math.min(100, downloaded * 100 / total) : 0;
                    if (progress != lastProgress) {
                        lastProgress = progress;
                        JSObject event = new JSObject();
                        event.put("progress", progress);
                        event.put("downloaded", downloaded);
                        event.put("total", total);
                        notifyListeners("downloadProgress", event);
                    }
                }
            }

            String actualSha256 = sha256(output);
            if (!expectedSha256.equals(actualSha256)) {
                output.delete();
                throw new SecurityException("升级包校验失败");
            }

            File apk = output;
            getActivity().runOnUiThread(() -> {
                try {
                    Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                    Intent install = new Intent(Intent.ACTION_INSTALL_PACKAGE);
                    install.setData(apkUri);
                    install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(install);
                    call.resolve();
                } catch (Exception error) {
                    call.reject("无法打开系统安装器", error);
                }
            });
        } catch (Exception error) {
            if (output != null) output.delete();
            call.reject(error.getMessage() == null ? "升级失败" : error.getMessage(), error);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private boolean canInstallPackages() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder result = new StringBuilder();
        for (byte value : digest.digest()) result.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        return result.toString();
    }
}
