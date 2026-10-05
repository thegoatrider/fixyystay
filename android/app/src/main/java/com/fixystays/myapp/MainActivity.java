package com.fixystays.myapp;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebViewClient(new BridgeWebViewClient(this.bridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri url = request.getUrl();
                    if (url != null) {
                        String urlStr = url.toString();
                        if (urlStr.startsWith("upi://") || urlStr.startsWith("gpay://") || 
                            urlStr.startsWith("phonepe://") || urlStr.startsWith("paytmmp://")) {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, url);
                                startActivity(intent);
                                return true;
                            } catch (ActivityNotFoundException e) {
                                return false;
                            }
                        } else if (urlStr.startsWith("intent://")) {
                            try {
                                Intent intent = Intent.parseUri(urlStr, Intent.URI_INTENT_SCHEME);
                                if (intent != null) {
                                    PackageManager pm = getPackageManager();
                                    if (intent.resolveActivity(pm) != null) {
                                        startActivity(intent);
                                        return true;
                                    }
                                    String fallbackUrl = intent.getStringExtra("browser_fallback_url");
                                    if (fallbackUrl != null) {
                                        view.loadUrl(fallbackUrl);
                                        return true;
                                    }
                                }
                            } catch (Exception e) {
                                return false;
                            }
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }
}
