package com.harlequinxd.hellos;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;



import java.util.ArrayList;
import java.util.List;

/**
 * HellOS host. The whole fake OS is a web app in assets/www, served from a
 * secure https origin so camera, microphone, IndexedDB and Web Audio all work.
 * Native features (torch, vibration, brightness, back key) go through HellBridge.
 */
public class MainActivity extends Activity {

    private static final String START_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int REQ_MEDIA = 666;

    private WebView web;
    private FrameLayout root;
    private PermissionRequest pendingRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0B0505"));
        root.setFitsSystemWindows(false);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0B0505"));
        web.setFitsSystemWindows(false);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        goImmersive();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        final LocalAssets loader = new LocalAssets(this);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.intercept(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Keep everything inside HellOS (Brimstone handles real sites in its own frame).
                return !request.isForMainFrame() ? false : !request.getUrl().toString().startsWith("https://appassets.androidplatform.net/");
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handlePermission(request));
            }
        });

        web.addJavascriptInterface(new HellBridge(this, web), "HellBridge");
        web.loadUrl(START_URL);
    }

    private void handlePermission(PermissionRequest request) {
        List<String> needed = new ArrayList<>();
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)
                    && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.CAMERA);
            }
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)
                    && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.RECORD_AUDIO);
            }
        }
        if (needed.isEmpty()) {
            request.grant(request.getResources());
        } else {
            if (pendingRequest != null) pendingRequest.deny();
            pendingRequest = request;
            requestPermissions(needed.toArray(new String[0]), REQ_MEDIA);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_MEDIA || pendingRequest == null) return;
        boolean ok = grantResults.length > 0;
        for (int g : grantResults) if (g != PackageManager.PERMISSION_GRANTED) ok = false;
        if (ok) pendingRequest.grant(pendingRequest.getResources());
        else pendingRequest.deny();
        pendingRequest = null;
    }

    void goImmersive() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            w.setStatusBarColor(Color.TRANSPARENT);
            w.setNavigationBarColor(Color.TRANSPARENT);
            w.setStatusBarContrastEnforced(false);
            w.setNavigationBarContrastEnforced(false);
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
            // Keep text fields above the keyboard while the system bars are hidden.
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                int ime = insets.isVisible(WindowInsets.Type.ime()) ? insets.getInsets(WindowInsets.Type.ime()).bottom : 0;
                v.setPadding(0, 0, 0, ime);
                float density = getResources().getDisplayMetrics().density;
                int top = Math.round(insets.getInsets(WindowInsets.Type.displayCutout()).top / density);
                int bottom = Math.round(insets.getInsets(WindowInsets.Type.displayCutout()).bottom / density);
                web.evaluateJavascript("document.documentElement.style.setProperty('--native-safe-top','" + top + "px');document.documentElement.style.setProperty('--native-safe-bottom','" + bottom + "px');window.PhoneUI&&PhoneUI.refresh()", null);
                return WindowInsets.CONSUMED;
            });
            root.requestApplyInsets();
        } else {
            //noinspection deprecation
            w.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.OS && OS.back) ? OS.back() : 'exit'", value -> {
            if (value == null || value.contains("exit")) moveTaskToBack(true);
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.OS && OS.onPause && OS.onPause()", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        goImmersive();
        web.evaluateJavascript("window.OS && OS.onResume && OS.onResume()", null);
    }

    @Override
    protected void onDestroy() {
        HellBridge.torchOff(this);
        web.destroy();
        super.onDestroy();
    }
}
