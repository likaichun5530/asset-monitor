package com.youshu.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        ThemePlugin.applySavedThemeMode(this);
        registerPlugin(UpdaterPlugin.class);
        registerPlugin(ThemePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
