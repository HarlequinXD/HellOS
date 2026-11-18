import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.List;

class SignApk {
    public static void main(String[] args) throws Exception {
        char[] password = System.getenv("HELLOS_KEY_PASS").toCharArray();
        KeyStore keys = KeyStore.getInstance("PKCS12");
        try (var input = Files.newInputStream(Path.of(args[0]))) { keys.load(input, password); }
        var key = (PrivateKey)keys.getKey("hellos", password);
        var certificate = (X509Certificate)keys.getCertificate("hellos");
        var config = new ApkSigner.SignerConfig.Builder("hellos", key, List.of(certificate)).build();
        var output = new File(args[2]);
        new ApkSigner.Builder(List.of(config)).setInputApk(new File(args[1])).setOutputApk(output)
            .setV1SigningEnabled(false).setV2SigningEnabled(true).setV3SigningEnabled(true).build().sign();
        var check = new ApkVerifier.Builder(output).build().verify();
        if (!check.isVerified() || !check.isVerifiedUsingV2Scheme() || !check.isVerifiedUsingV3Scheme()) {
            throw new IllegalStateException(check.getErrors().toString());
        }
        System.out.println("APK signature verified (v2 and v3)");
    }
}
