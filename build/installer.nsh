; CS E-Bid Analyzer — assisted installer: install/update or uninstall from Setup EXE.
!include "FileFunc.nsh"
!include nsDialogs.nsh
!include LogicLib.nsh

; Included before electron-builder registry defines — use APP_GUID / UNINSTALL_APP_KEY from makensis CLI.
!define CSEBID_INSTALL_REG_KEY "Software\${APP_GUID}"
!define CSEBID_UNINSTALL_REG_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"

!ifndef BUILD_UNINSTALLER

Var CsebidSetupActionDialog
Var CsebidRadioInstall
Var CsebidRadioUninstall

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
  Page custom CsebidSetupActionCreate CsebidSetupActionLeave ": 설치 옵션"
!macroend

!macro customInit
  Call CsebidCheckCliRemove
!macroend

Function CsebidCheckCliRemove
  ${GetParameters} $R0
  ${GetOptions} $R0 "/remove" $R1
  ${IfNot} ${Errors}
    Call CsebidRunUninstaller
    Quit
  ${EndIf}
FunctionEnd

Function CsebidRunUninstaller
  Push $0
  Push $1
  Push $2

  StrCpy $2 "0"
  ${GetParameters} $R3
  ${GetOptions} $R3 "/S" $R1
  ${IfNot} ${Errors}
    StrCpy $2 "1"
  ${EndIf}

  StrCpy $0 ""
  ReadRegStr $0 HKCU "${CSEBID_UNINSTALL_REG_KEY}" UninstallString
  ${If} $0 == ""
    !ifdef UNINSTALL_REGISTRY_KEY_2
      ReadRegStr $0 HKCU "${UNINSTALL_REGISTRY_KEY_2}" UninstallString
    !endif
  ${EndIf}

  ${If} $0 == ""
    ${If} $2 != "1"
      MessageBox MB_ICONSTOP "제거 프로그램을 찾을 수 없습니다.$\n$\nWindows 설정 → 앱 → 설치된 앱에서 제거해 주세요."
    ${EndIf}
    Goto csebid_uninstall_done
  ${EndIf}

  ${If} $2 == "1"
    ReadRegStr $0 HKCU "${CSEBID_UNINSTALL_REG_KEY}" QuietUninstallString
    ${If} $0 == ""
      !ifdef UNINSTALL_REGISTRY_KEY_2
        ReadRegStr $0 HKCU "${UNINSTALL_REGISTRY_KEY_2}" QuietUninstallString
      !endif
    ${EndIf}
  ${EndIf}

  ClearErrors
  ExecWait '$0' $1
  ${If} $2 == "1"
    Goto csebid_uninstall_done
  ${EndIf}
  ${If} $1 == 0
    MessageBox MB_ICONINFORMATION "CS E-Bid Analyzer가 제거되었습니다."
  ${ElseIf} $1 == 2
    ; user cancelled uninstall wizard
  ${Else}
    MessageBox MB_ICONEXCLAMATION "제거가 완료되지 않았습니다. (코드: $1)"
  ${EndIf}

  csebid_uninstall_done:
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

Function CsebidSetupActionCreate
  StrCpy $R9 ""
  ReadRegStr $R9 HKCU "${CSEBID_INSTALL_REG_KEY}" InstallLocation
  ${If} $R9 == ""
    ReadRegStr $R9 HKLM "${CSEBID_INSTALL_REG_KEY}" InstallLocation
    ${If} $R9 == ""
      Abort
    ${EndIf}
  ${EndIf}

  nsDialogs::Create 1018
  Pop $CsebidSetupActionDialog
  ${If} $CsebidSetupActionDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0u 0u 100% 24u "이미 설치된 버전이 있습니다. 원하는 작업을 선택하세요."
  Pop $0

  ${NSD_CreateRadioButton} 10u 36u 100% 12u "애플리케이션 설치 또는 업데이트"
  Pop $CsebidRadioInstall
  ${NSD_Check} $CsebidRadioInstall

  ${NSD_CreateRadioButton} 10u 56u 100% 12u "애플리케이션 제거"
  Pop $CsebidRadioUninstall

  nsDialogs::Show
FunctionEnd

Function CsebidSetupActionLeave
  ${NSD_GetState} $CsebidRadioUninstall $0
  ${If} $0 != ${BST_CHECKED}
    Return
  ${EndIf}

  MessageBox MB_ICONQUESTION|MB_YESNO "CS E-Bid Analyzer를 제거하시겠습니까?$\n$\n사용자 데이터(%APPDATA%\CS E-Bid Analyzer)는 유지됩니다." IDYES csebid_do_uninstall
  Abort

  csebid_do_uninstall:
  Call CsebidRunUninstaller
  Quit
FunctionEnd

!endif
