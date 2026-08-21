package com.sydneycoursefinder.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.Window;
import android.view.WindowManager;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.window.OnBackInvokedDispatcher;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar pageProgress;
    private boolean refreshWebAssetsOnLoad;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setNavigationBarColor(Color.BLACK);
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        refreshWebAssetsOnLoad = getSharedPreferences("app_state", MODE_PRIVATE)
            .getInt("web_asset_version", 0) < BuildConfig.VERSION_CODE;
        if (refreshWebAssetsOnLoad) webView.clearCache(true);
        webView.setBackgroundColor(Color.WHITE);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setVerticalScrollBarEnabled(false);
        webView.setScrollbarFadingEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (refreshWebAssetsOnLoad) {
                    refreshWebAssetsOnLoad = false;
                    getSharedPreferences("app_state", MODE_PRIVATE)
                        .edit()
                        .putInt("web_asset_version", BuildConfig.VERSION_CODE)
                        .apply();
                    view.evaluateJavascript(
                        "(() => { const reload = () => location.replace(location.href + (location.search ? '&' : '?') + 'appBuild="
                            + BuildConfig.VERSION_CODE
                            + "'); const tasks = []; if ('serviceWorker' in navigator) tasks.push(navigator.serviceWorker.getRegistrations().then(items => Promise.all(items.map(item => item.unregister())))); if ('caches' in window) tasks.push(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))); Promise.all(tasks).finally(reload); })();",
                        null
                    );
                    return;
                }
                hideStatusBar();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                Uri appUrl = Uri.parse(BuildConfig.APP_URL);
                if (url.getHost() != null && url.getHost().equalsIgnoreCase(appUrl.getHost())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, url));
                return true;
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri target = Uri.parse(url);
                Uri appUrl = Uri.parse(BuildConfig.APP_URL);
                if (target.getHost() != null && target.getHost().equalsIgnoreCase(appUrl.getHost())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, target));
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                pageProgress.setProgress(newProgress);
                if (newProgress >= 100) {
                    pageProgress.animate().alpha(0f).setDuration(140).withEndAction(() -> pageProgress.setVisibility(View.GONE)).start();
                } else {
                    if (pageProgress.getVisibility() != View.VISIBLE) pageProgress.setVisibility(View.VISIBLE);
                    pageProgress.animate().cancel();
                    pageProgress.setAlpha(1f);
                }
            }
        });
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setLoadsImagesAutomatically(true);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setGeolocationEnabled(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            settings.setOffscreenPreRaster(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            webView.setForceDarkAllowed(false);
        }

        pageProgress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        pageProgress.setMax(100);
        pageProgress.setProgress(0);
        pageProgress.setProgressTintList(ColorStateList.valueOf(Color.rgb(37, 99, 235)));
        pageProgress.setProgressBackgroundTintList(ColorStateList.valueOf(Color.TRANSPARENT));

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.WHITE);
        rootLayout.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        FrameLayout.LayoutParams progressLayout = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            Math.max(3, Math.round(getResources().getDisplayMetrics().density * 3))
        );
        progressLayout.gravity = Gravity.TOP;
        rootLayout.addView(pageProgress, progressLayout);
        setContentView(rootLayout);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleBackPress
            );
        }
        hideStatusBar();
        if (savedInstanceState == null) {
            webView.loadUrl(BuildConfig.APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void hideStatusBar() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            View decorView = window.getDecorView();
            WindowInsetsController controller = decorView == null ? null : decorView.getWindowInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
            return;
        }

        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        window.getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideStatusBar();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideStatusBar();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        handleBackPress();
    }

    private void handleBackPress() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
            "(() => { try { return !!(window.courseFinderTheme && window.courseFinderTheme.handleMobileBack && window.courseFinderTheme.handleMobileBack()); } catch (error) { return false; } })();",
            handled -> {
                if ("true".equals(handled)) return;
                navigateBackOrFinish();
            }
        );
    }

    private void navigateBackOrFinish() {
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        finish();
    }
}
