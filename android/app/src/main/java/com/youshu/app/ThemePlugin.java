package com.youshu.app;

import android.app.UiModeManager;
import android.content.Context;
import android.os.Build;
import androidx.appcompat.app.AppCompatDelegate;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeTheme")
public class ThemePlugin extends Plugin {
    public static final String PREFERENCES_NAME = "youshu_native_theme";
    public static final String MODE_KEY = "mode";

    @PluginMethod
    public void setMode(PluginCall call) {
        String mode = call.getString("mode", "system");
        if (!mode.equals("light") && !mode.equals("dark") && !mode.equals("system")) {
            call.reject("Unsupported theme mode");
            return;
        }

        getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(MODE_KEY, mode)
            .apply();

        getActivity().runOnUiThread(() -> applyThemeMode(getContext(), mode));
        JSObject result = new JSObject();
        result.put("mode", mode);
        call.resolve(result);
    }

    public static void applySavedThemeMode(Context context) {
        String mode = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(MODE_KEY, "system");
        applyThemeMode(context, mode);
    }

    private static void applyThemeMode(Context context, String mode) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            UiModeManager manager = (UiModeManager) context.getSystemService(Context.UI_MODE_SERVICE);
            int nativeMode = mode.equals("dark")
                ? UiModeManager.MODE_NIGHT_YES
                : mode.equals("light") ? UiModeManager.MODE_NIGHT_NO : UiModeManager.MODE_NIGHT_AUTO;
            manager.setApplicationNightMode(nativeMode);
            return;
        }

        int delegateMode = mode.equals("dark")
            ? AppCompatDelegate.MODE_NIGHT_YES
            : mode.equals("light") ? AppCompatDelegate.MODE_NIGHT_NO : AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
        AppCompatDelegate.setDefaultNightMode(delegateMode);
    }
}
