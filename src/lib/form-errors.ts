export function formErrorMessage(code?: string) {
  if (!code) {
    return "";
  }

  if (code === "save") {
    return "保存できませんでした。入力内容を確認して、もう一度保存してください。";
  }

  if (code === "no-hypothesis") {
    return "主な見立てを入力すると保存できます。別方向からの見立ても考えられる場合は、必要な分だけ残してください。";
  }

  return "入力内容を確認してください。必須項目が空欄、または日付・数値の形式が合っていません。";
}
