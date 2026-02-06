#!/bin/bash
# SessionStart Hook
# Opens debug log in a new window only when --debug flag is present

# Check if --debug flag is present in parent process tree
check_debug_flag() {
    local pid=$$

    # Windows (Git Bash / MSYS / Cygwin)
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
        # Method 1: Check /proc if available (Git Bash)
        if [[ -f "/proc/$pid/cmdline" ]]; then
            while [[ $pid -ne 1 ]]; do
                local cmdline
                cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null)
                if [[ "$cmdline" =~ (^|[[:space:]])--debug($|[[:space:]]) ]]; then
                    return 0
                fi
                local ppid
                ppid=$(awk '{print $4}' "/proc/$pid/stat" 2>/dev/null)
                [[ -z "$ppid" || "$ppid" == "$pid" || "$ppid" == "0" ]] && break
                pid=$ppid
            done
        fi

        # Method 2: Use wmic (Windows native)
        if command -v wmic &> /dev/null; then
            local result
            result=$(wmic process where "name like '%claude%' or name like '%node%'" get commandline 2>/dev/null | grep -i "\-\-debug")
            [[ -n "$result" ]] && return 0
        fi

        # Method 3: Use PowerShell
        if command -v powershell &> /dev/null; then
            local result
            result=$(powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -match '--debug' } | Select-Object -First 1" 2>/dev/null)
            [[ -n "$result" ]] && return 0
        fi

        return 1
    fi

    # Linux / macOS
    while [[ $pid -ne 1 ]]; do
        local cmdline
        if [[ -f "/proc/$pid/cmdline" ]]; then
            # Linux
            cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null)
        else
            # macOS
            cmdline=$(ps -p "$pid" -o args= 2>/dev/null)
        fi

        if [[ "$cmdline" =~ (^|[[:space:]])--debug($|[[:space:]]) ]]; then
            return 0
        fi

        # Get parent PID
        local ppid
        ppid=$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ')
        [[ -z "$ppid" || "$ppid" == "$pid" ]] && break
        pid=$ppid
    done
    return 1
}

# Exit early if --debug flag is not present
if ! check_debug_flag; then
    exit 0
fi

# Read JSON input from stdin
INPUT=$(cat)

# Extract session_id using jq (if available) or sed
if command -v jq &> /dev/null; then
    SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
else
    # Fallback to sed (works on both BSD and GNU)
    SESSION_ID=$(echo "$INPUT" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
fi

# Exit if session_id is not found
if [[ -z "$SESSION_ID" || "$SESSION_ID" == "null" ]]; then
    echo "Error: session_id not found" >&2
    exit 1
fi

DEBUG_LOG="$HOME/.claude/debug/${SESSION_ID}.txt"

# Convert path for Windows if needed
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    DEBUG_LOG_WIN=$(cygpath -w "$DEBUG_LOG" 2>/dev/null || echo "$DEBUG_LOG")
else
    DEBUG_LOG_WIN="$DEBUG_LOG"
fi

# Wait for file creation (max 5 seconds, 1 second interval)
for i in {1..5}; do
    [[ -f "$DEBUG_LOG" ]] && break
    sleep 1
done

# Exit if file not found after waiting
if [[ ! -f "$DEBUG_LOG" ]]; then
    echo "Error: debug log not found: $DEBUG_LOG" >&2
    exit 1
fi

# Open debug log in a new terminal window
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"tail -n 1000 -f '$DEBUG_LOG'\""

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - try common terminal emulators
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- tail -n 1000 -f "$DEBUG_LOG"
    elif command -v konsole &> /dev/null; then
        konsole -e tail -n 1000 -f "$DEBUG_LOG"
    elif command -v xterm &> /dev/null; then
        xterm -e tail -n 1000 -f "$DEBUG_LOG" &
    else
        echo "Error: no supported terminal emulator found" >&2
        exit 1
    fi

elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash / MSYS / Cygwin)

    # Method 1: Windows Terminal (wt) - recommended
    if command -v wt.exe &> /dev/null; then
        wt.exe new-tab powershell -NoExit -Command "Get-Content -Path '$DEBUG_LOG_WIN' -Tail 1000 -Wait" &

    # Method 2: PowerShell in new window
    elif command -v powershell &> /dev/null; then
        powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', \"Get-Content -Path '$DEBUG_LOG_WIN' -Tail 1000 -Wait\"" &

    # Method 3: mintty (Git Bash terminal)
    elif command -v mintty &> /dev/null; then
        mintty -e tail -n 1000 -f "$DEBUG_LOG" &

    # Method 4: cmd with PowerShell (fallback)
    else
        start "" powershell -NoExit -Command "Get-Content -Path '$DEBUG_LOG_WIN' -Tail 1000 -Wait"
    fi
else
    echo "Error: unsupported OS: $OSTYPE" >&2
    exit 1
fi
