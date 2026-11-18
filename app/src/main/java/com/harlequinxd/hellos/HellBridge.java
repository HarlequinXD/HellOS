package com.harlequinxd.hellos;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/** Native helpers exposed to the OS as window.HellBridge. */
public class HellBridge {

    private final Activity activity;
    private final WebView web;

    HellBridge(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    @JavascriptInterface
    public boolean isNative() {
        return true;
    }

    @JavascriptInterface
    public void vibrate(long ms) {
        Vibrator v = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) return;
        long d = Math.max(1, Math.min(ms, 3000));
        v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
    }

    private static String flashCameraId(Context ctx) {
        try {
            CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
            if (cm == null) return null;
            for (String id : cm.getCameraIdList()) {
                Boolean flash = cm.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (flash != null && flash) return id;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @JavascriptInterface
    public boolean hasTorch() {
        return flashCameraId(activity) != null;
    }

    @JavascriptInterface
    public boolean torch(boolean on) {
        try {
            String id = flashCameraId(activity);
            if (id == null) return false;
            CameraManager cm = (CameraManager) activity.getSystemService(Context.CAMERA_SERVICE);
            cm.setTorchMode(id, on);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    static void torchOff(Context ctx) {
        try {
            String id = flashCameraId(ctx);
            if (id == null) return;
            CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
            cm.setTorchMode(id, false);
        } catch (Exception ignored) {
        }
    }

    /** level 0..1, or negative to follow the system brightness. */
    @JavascriptInterface
    public void setBrightness(final float level) {
        activity.runOnUiThread(() -> {
            WindowManager.LayoutParams lp = activity.getWindow().getAttributes();
            lp.screenBrightness = level < 0 ? WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                    : Math.max(0.02f, Math.min(1f, level));
            activity.getWindow().setAttributes(lp);
        });
    }

    @JavascriptInterface
    public String battery() {
        Intent i = activity.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (i == null) return "{\"level\":66,\"charging\":false}";
        int level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, 66);
        int scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        int status = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
        int pct = scale > 0 ? Math.round(level * 100f / scale) : level;
        return "{\"level\":" + pct + ",\"charging\":" + charging + "}";
    }

    @JavascriptInterface
    public String device() {
        return Build.MANUFACTURER + " " + Build.MODEL;
    }

    @JavascriptInterface
    public void exitApp() {
        activity.runOnUiThread(() -> activity.moveTaskToBack(true));
    }
}
