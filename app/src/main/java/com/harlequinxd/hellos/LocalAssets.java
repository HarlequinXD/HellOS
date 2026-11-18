package com.harlequinxd.hellos;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Serves app/src/main/assets/www from https://appassets.androidplatform.net/assets/www/.
 * A secure origin keeps camera, microphone, IndexedDB and Web Audio working,
 * without needing the AndroidX WebViewAssetLoader dependency.
 */
final class LocalAssets {

    static final String HOST = "appassets.androidplatform.net";
    private static final String PREFIX = "/assets/";
    private static final Map<String, String> MIME = new HashMap<>();

    static {
        MIME.put("html", "text/html");
        MIME.put("js", "application/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("webp", "image/webp");
        MIME.put("gif", "image/gif");
        MIME.put("svg", "image/svg+xml");
        MIME.put("ttf", "font/ttf");
        MIME.put("otf", "font/otf");
        MIME.put("woff", "font/woff");
        MIME.put("woff2", "font/woff2");
        MIME.put("mp3", "audio/mpeg");
        MIME.put("ogg", "audio/ogg");
        MIME.put("wav", "audio/wav");
    }

    private final Context context;

    LocalAssets(Context context) {
        this.context = context.getApplicationContext();
    }

    /** Returns the asset for our host, or null so other requests go to the network. */
    WebResourceResponse intercept(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) return null;
        String path = uri.getPath();
        if (path == null || !path.startsWith(PREFIX + "www/") || path.contains("\\")) return notFound();
        for (String part : path.split("/")) {
            if (part.equals("..") || part.equals(".")) return notFound();
        }
        String file = path.substring(PREFIX.length());
        try {
            return new WebResourceResponse(mimeOf(file), "UTF-8", 200, "OK",
                    Collections.singletonMap("Cache-Control", "no-cache"),
                    context.getAssets().open(file));
        } catch (IOException e) {
            return notFound();
        }
    }

    private static String mimeOf(String file) {
        int dot = file.lastIndexOf('.');
        String ext = dot < 0 ? "" : file.substring(dot + 1).toLowerCase(Locale.ROOT);
        String type = MIME.get(ext);
        return type != null ? type : "application/octet-stream";
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
}
