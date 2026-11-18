package com.harlequinxd.hellos;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Locale;

/** Same secure local asset origin, without a runtime AndroidX dependency. */
final class LocalAssets {
 private final Context context;
 LocalAssets(Context context){this.context=context;}
 WebResourceResponse intercept(Uri uri){
  if(!"https".equals(uri.getScheme())||!"appassets.androidplatform.net".equals(uri.getHost()))return null;
  String path=uri.getPath();
  if(path==null||!path.startsWith("/assets/www/")||path.indexOf('\\')>=0)return missing();
  for(String segment:path.split("/"))if(segment.equals("..")||segment.equals("."))return missing();
  String file=path.substring("/assets/".length()), lower=file.toLowerCase(Locale.ROOT);
  String mime=lower.endsWith(".html")?"text/html":lower.endsWith(".js")?"application/javascript":
   lower.endsWith(".css")?"text/css":lower.endsWith(".json")?"application/json":
   lower.endsWith(".png")?"image/png":lower.endsWith(".jpg")||lower.endsWith(".jpeg")?"image/jpeg":
   lower.endsWith(".svg")?"image/svg+xml":lower.endsWith(".webp")?"image/webp":"application/octet-stream";
  try{return new WebResourceResponse(mime,"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-cache"),context.getAssets().open(file));}
  catch(IOException problem){return missing();}
 }
 private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
}
