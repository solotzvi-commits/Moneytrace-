package com.moneytrace.app;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {
    private boolean hasUsageAccess() {
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            mode = appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(), getContext().getPackageName());
        } else {
            mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(), getContext().getPackageName());
        }
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasUsageAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("לא ניתן לפתוח את הגדרות הגישה לנתוני שימוש", error);
        }
    }

    @PluginMethod
    public void getUsage(PluginCall call) {
        if (!hasUsageAccess()) {
            call.reject("נדרשת הרשאת גישה לנתוני שימוש בהגדרות Android");
            return;
        }
        JSArray requested = call.getArray("packages", new JSArray());
        if (requested.length() > 30) {
            call.reject("ניתן לבדוק עד 30 אפליקציות בכל פעם");
            return;
        }
        long end = System.currentTimeMillis();
        long start = end - 30L * 24L * 60L * 60L * 1000L;
        UsageStatsManager manager = (UsageStatsManager) getContext()
                .getSystemService(Context.USAGE_STATS_SERVICE);
        if (manager == null) {
            call.reject("נתוני השימוש אינם זמינים במכשיר");
            return;
        }

        Map<String, UsageStats> totals = new HashMap<>();
        List<UsageStats> stats = manager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, start, end);
        if (stats != null) {
            for (UsageStats stat : stats) {
                String packageName = stat.getPackageName();
                if (packageName == null || packageName.equals(getContext().getPackageName())) continue;
                boolean allowed = false;
                for (int i = 0; i < requested.length(); i++) {
                    try {
                        if (packageName.equals(requested.getString(i))) {
                            allowed = true;
                            break;
                        }
                    } catch (JSONException ignored) { }
                }
                if (!allowed) continue;
                UsageStats previous = totals.get(packageName);
                if (previous == null) {
                    totals.put(packageName, stat);
                } else {
                    // Aggregate foreground time across daily records; preserve most recent use.
                    previous = new UsageStats(previous);
                    previous.add(stat);
                    totals.put(packageName, previous);
                }
            }
        }

        JSArray output = new JSArray();
        for (Map.Entry<String, UsageStats> entry : totals.entrySet()) {
            UsageStats stat = entry.getValue();
            JSObject item = new JSObject();
            item.put("packageName", entry.getKey());
            item.put("foregroundMs30d", stat.getTotalTimeInForeground());
            item.put("lastTimeUsed", stat.getLastTimeUsed());
            output.put(item);
        }
        JSObject result = new JSObject();
        result.put("periodDays", 30);
        result.put("apps", output);
        call.resolve(result);
    }
}
