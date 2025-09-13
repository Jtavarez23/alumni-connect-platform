@echo off
echo Setting up DeepSeek API configuration for Claude Code...

REM Set environment variables for current session
set "ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic"
set "ANTHROPIC_AUTH_TOKEN=sk-70fa0935d7d144c3a142a6c36cc43922"
set "ANTHROPIC_API_KEY=sk-70fa0935d7d144c3a142a6c36cc43922"
set "ANTHROPIC_MODEL=deepseek-reasoner"
set "ANTHROPIC_SMALL_FAST_MODEL=deepseek-chat"
set "API_TIMEOUT_MS=600000"
set "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1"

REM Set environment variables permanently
setx ANTHROPIC_BASE_URL "https://api.deepseek.com/anthropic"
setx ANTHROPIC_AUTH_TOKEN "sk-70fa0935d7d144c3a142a6c36cc43922"
setx ANTHROPIC_API_KEY "sk-70fa0935d7d144c3a142a6c36cc43922"
setx ANTHROPIC_MODEL "deepseek-reasoner"
setx ANTHROPIC_SMALL_FAST_MODEL "deepseek-chat"
setx API_TIMEOUT_MS "600000"
setx CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC "1"

echo.
echo ✅ DeepSeek configuration complete!
echo ✅ Environment variables set for current session and saved permanently
echo.
echo Current configuration:
echo   Base URL: %ANTHROPIC_BASE_URL%
echo   Model: %ANTHROPIC_MODEL%
echo   Small Model: %ANTHROPIC_SMALL_FAST_MODEL%
echo   Timeout: %API_TIMEOUT_MS%ms
echo   API Key: %ANTHROPIC_API_KEY:~0,12%...
echo.
echo ⚠️  You may need to restart your terminal for permanent changes to take effect
echo.
pause