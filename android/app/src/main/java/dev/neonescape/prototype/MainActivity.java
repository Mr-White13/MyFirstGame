package dev.neonescape.prototype;

import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * NEON ESCAPE's only activity: Capacitor's WebView running the web build.
 *
 * The game is shown full screen (immersive): the status and navigation bars
 * are hidden and come back briefly when the player swipes from an edge, so
 * the system Back gesture and the buttons still work. The bars are hidden
 * again whenever the window regains focus (after a dialog, a swipe, or a
 * return from the background). The web layout already keeps its controls
 * clear of cutouts with CSS safe-area insets.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        Window window = getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
