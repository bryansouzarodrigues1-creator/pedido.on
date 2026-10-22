@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0..\.."
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 24 ou mais recente e abra este arquivo novamente.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
  echo Este leitor precisa do Node.js 24 ou mais recente.
  pause
  exit /b 1
)
set "QA_PLAYWRIGHT_MODULE=%CD%\.sites-runtime\ifood-capture-tools\node_modules\playwright-core"
node -e "try { process.exit(require(process.env.QA_PLAYWRIGHT_MODULE + '/package.json').version === '1.64.1' ? 0 : 1) } catch { process.exit(1) }"
if errorlevel 1 (
  echo Preparando o leitor local. Isso baixa o driver, sem usar creditos de IA.
  call npm install --prefix "%CD%\.sites-runtime\ifood-capture-tools" --no-audit --no-fund --ignore-scripts --save-exact playwright-core@1.64.1
  if errorlevel 1 (
    echo Nao foi possivel preparar o leitor. Confira a conexao e o npm.
    pause
    exit /b 1
  )
)
node tools\ifood-capture-runner\desktop.mjs
set "CAPTURE_EXIT=%ERRORLEVEL%"
pause
exit /b %CAPTURE_EXIT%
