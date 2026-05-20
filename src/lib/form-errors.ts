export function formErrorMessage(code?: string) {
  if (!code) {
    return "";
  }

  if (code === "save") {
    return "保存できませんでした。入力内容を確認して、もう一度保存してください。";
  }

  if (code === "no-hypothesis") {
    return "仮説1を入力すると保存できます。別の可能性も考えられる場合は、仮説2以降に残してください。";
  }

  return "入力内容を確認してください。必須項目が空欄、または日付・数値の形式が合っていません。";
}
