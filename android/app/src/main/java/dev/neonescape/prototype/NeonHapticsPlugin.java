package dev.neonescape.prototype;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

/**
 * Game vibration for NEON ESCAPE.
 *
 * The stock Capacitor Haptics plugin vibrates without usage attributes, and
 * Android then treats short vibrations as TOUCH feedback: they follow the
 * phone's "touch feedback" switch, which is often off, so nothing is felt.
 * This plugin plays a waveform (durations + amplitudes) tagged as game/media
 * vibration instead, which follows the media vibration intensity setting.
 *
 * JS: NeonHaptics.vibrate({ timings: [40, 60, 40], amplitudes: [220, 0, 220] })
 *     NeonHaptics.cancel()
 *     NeonHaptics.info() -> { hasVibrator, hasAmplitudeControl, touchFeedback, sdk }
 */
@CapacitorPlugin(name = "NeonHaptics")
public class NeonHapticsPlugin extends Plugin {

    private Vibrator vibrator;

    @Override
    public void load() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = manager != null ? manager.getDefaultVibrator() : null;
        } else {
            vibrator = legacyVibrator(context);
        }
    }

    @SuppressWarnings("deprecation")
    private static Vibrator legacyVibrator(Context context) {
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.reject("This device has no vibrator", "NO_VIBRATOR");
            return;
        }
        long[] timings;
        int[] amplitudes;
        try {
            JSArray t = call.getArray("timings");
            JSArray a = call.getArray("amplitudes");
            if (t == null || t.length() == 0) {
                call.reject("timings are required", "BAD_ARGS");
                return;
            }
            timings = new long[t.length()];
            amplitudes = new int[t.length()];
            for (int i = 0; i < t.length(); i++) {
                // Never a long or continuous buzz, whatever the caller asks for.
                timings[i] = Math.max(0, Math.min(500, t.getLong(i)));
                int amp = a != null && i < a.length() ? a.getInt(i) : 255;
                amplitudes[i] = Math.max(0, Math.min(255, amp));
            }
        } catch (JSONException e) {
            call.reject("Invalid vibration pattern", "BAD_ARGS", e);
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                VibrationEffect effect = vibrator.hasAmplitudeControl()
                    ? VibrationEffect.createWaveform(timings, amplitudes, -1)
                    : VibrationEffect.createWaveform(onOffPattern(timings, amplitudes), -1);
                if (Build.VERSION.SDK_INT >= 33) {
                    vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_MEDIA));
                } else {
                    vibrator.vibrate(effect, gameAudioAttributes());
                }
            } else {
                legacyVibrate(onOffPattern(timings, amplitudes));
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Vibration failed: " + e.getMessage(), "VIBRATE_FAILED", e);
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        if (vibrator != null) vibrator.cancel();
        call.resolve();
    }

    /** What the device reports; used only by the Settings diagnostic. */
    @PluginMethod
    public void info(PluginCall call) {
        JSObject result = new JSObject();
        result.put("hasVibrator", vibrator != null && vibrator.hasVibrator());
        result.put("hasAmplitudeControl", vibrator != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl());
        int touch = Settings.System.getInt(getContext().getContentResolver(), Settings.System.HAPTIC_FEEDBACK_ENABLED, -1);
        result.put("touchFeedback", touch);
        result.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(result);
    }

    private static AudioAttributes gameAudioAttributes() {
        return new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
    }

    /**
     * Without amplitude control: an off/on timing pattern (starting with a
     * 0 ms delay), where segments with amplitude 0 are pauses.
     */
    private static long[] onOffPattern(long[] timings, int[] amplitudes) {
        java.util.ArrayList<Long> out = new java.util.ArrayList<>();
        out.add(0L);
        boolean on = true;
        for (int i = 0; i < timings.length; i++) {
            boolean segmentOn = amplitudes[i] > 0;
            if (segmentOn == on) {
                out.add(timings[i]);
                on = !on;
            } else {
                int last = out.size() - 1;
                out.set(last, out.get(last) + timings[i]);
            }
        }
        long[] result = new long[out.size()];
        for (int i = 0; i < result.length; i++) result[i] = out.get(i);
        return result;
    }

    @SuppressWarnings("deprecation")
    private void legacyVibrate(long[] pattern) {
        vibrator.vibrate(pattern, -1);
    }
}
