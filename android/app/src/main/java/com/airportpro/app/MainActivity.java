import com.airportpro.app.PassportScannerPlugin;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.airportpro.app.PassportScannerPlugin;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "MainActivity";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "===========================================");
        Log.d(TAG, "MainActivity onCreate - Registering plugins");
        Log.d(TAG, "===========================================");
        
        // CRITICAL: Register PassportScanner plugin
        registerPlugin(PassportScannerPlugin.class);
        
        Log.d(TAG, "✓ PassportScanner plugin registered");
        Log.d(TAG, "===========================================");
    }
}
