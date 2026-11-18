import com.android.apksig.ApkVerifier;
import java.nio.file.*;
import java.security.*;
import java.util.*;
public class VerifySigner {
 public static void main(String[] args)throws Exception{
  var result=new ApkVerifier.Builder(Path.of(args[0]).toFile()).build().verify();
  if(!result.isVerified())throw new IllegalStateException("APK signature failed");
  var keys=KeyStore.getInstance("JKS");
  try(var in=Files.newInputStream(Path.of(args[1]))){keys.load(in,"hellos666".toCharArray());}
  if(!Arrays.equals(keys.getCertificate("hellos").getEncoded(),result.getSignerCertificates().get(0).getEncoded()))throw new IllegalStateException("Signing certificate differs from upload");
  System.out.println("APK signature verified; certificate matches the supplied project key.");
 }
}
