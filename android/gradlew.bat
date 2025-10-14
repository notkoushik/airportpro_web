@echo off
setlocal

set DIR=%~dp0
rem Resolve APP_HOME to the absolute path
for %%i in ("%DIR%") do set APP_HOME=%%~fi
set APP_BASE_NAME=gradlew

rem Prefer JAVA_HOME if set, else fall back to PATH
if defined JAVA_HOME (
  set JAVA_EXE=%JAVA_HOME%\bin\java.exe
) else (
  set JAVA_EXE=java
)

rem Check Java is available
"%JAVA_EXE%" -version >NUL 2>&1
if %ERRORLEVEL% neq 0 (
  echo ERROR: Java not found. Set JAVA_HOME to a JDK 17 installation or add java to PATH.
  exit /b 1
)

set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
set WRAPPER_MAIN=org.gradle.wrapper.GradleWrapperMain

"%JAVA_EXE%" -Dorg.gradle.appname=%APP_BASE_NAME% -classpath "%CLASSPATH%" %WRAPPER_MAIN% %*
exit /b %ERRORLEVEL%