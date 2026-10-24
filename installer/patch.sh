#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
MODE="${1:---interactive-apply}"
APP="${2:-/Applications/Raycast.app}"
INTERACTIVE=0
case "${MODE}" in
 --interactive-apply|--interactive-restore)
  INTERACTIVE=1
  echo 'Raycast 2.9.0.0 arm64 原版汉化包'
  if [ "${MODE}" = --interactive-restore ]; then echo '恢复原版：撤销汉化，保留用户设置和插件数据。'; else echo '安装汉化：先确认原版已正常打开过一次，安装前自动备份。'; fi
  echo '修改资源会使完整官方签名失效；本工具不会关闭系统安全保护，也不会重新签名。'
  echo '仅适用于指定版本，其他版本更新后需要新补丁。请先退出 Raycast。'
  printf '应用路径（回车使用 /Applications/Raycast.app）：'
  IFS= read -r input
  if [ -n "${input}" ]; then APP="${input}"; fi
  # 不把访达拖入的路径当作 shell 代码执行。
  if [ ! -d "${APP}" ]; then echo '请输入实际路径，不要添加引号或反斜杠。'; exit 1; fi
  if [ "${MODE}" = --interactive-restore ]; then MODE=--restore; else MODE=--apply; fi
  ;;
 --apply|--restore|--check) ;;
 *) echo '用法：patch.sh --check|--apply|--restore /Applications/Raycast.app'; exit 2;;
esac
fail() { echo "失败：$*" >&2; exit 1; }
hash() { /usr/bin/shasum -a 256 "$1" | /usr/bin/awk '{print $1}'; }
confirm_action() {
 while true; do
  printf '%s（回车继续，输入 n 取消）：' "$1"
  if ! IFS= read -r answer; then echo '未收到确认，已取消；未修改应用。'; exit 1; fi
  case "${answer}" in
   ''|y|Y|yes|YES|Yes|是|确认) return 0 ;;
   n|N|no|NO|No|否|取消) echo '已取消，未修改应用。'; exit 0 ;;
   *) echo '未识别输入，请直接回车继续，或输入 n 取消。' ;;
  esac
 done
}

[ -d "${APP}/Contents" ] || fail '找不到所选应用。'
APP="$(cd "${APP}" && pwd -P)"
[ "${APP}" != / ] || fail '应用路径无效。'
VERSION=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "${APP}/Contents/Info.plist")
[ "${VERSION}" = '2.9.0.0' ] || fail "版本不匹配：${VERSION}。本包只支持 2.9.0.0。"
EXPECTED_BINARY=$(cat "${ROOT}/native-sha256.txt")
[ "$(hash "${APP}/Contents/MacOS/Raycast")" = "${EXPECTED_BINARY}" ] || fail '原生程序指纹不匹配，请使用指定 arm64 原版。'
if /bin/ps -axo comm= | /usr/bin/grep -F "${APP}/Contents/" >/dev/null; then fail 'Raycast 仍在运行，请从应用菜单退出后重试。'; fi
KEY=$(printf '%s' "${APP}" | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}')
BACKUP="${HOME}/Library/Application Support/Raycast-Chinese-Patch/2.9.0.0/${KEY}"
# 在任何写入前拒绝越界、重复和格式错误的清单路径。
/usr/bin/awk -F '\t' '
 NF != 3 || ($1 != "-" && ($1 !~ /^[0-9a-f]+$/ || length($1) != 64)) || $2 !~ /^[0-9a-f]+$/ || length($2) != 64 { exit 1 }
 $3 !~ /^Contents\/Resources\// || $3 ~ /(^|\/)\.\.?($|\/)/ || $3 ~ /\/\/|\/$/ || seen[$3]++ { exit 1 }
 END { if (NR == 0) exit 1 }
' "${ROOT}/manifest.tsv" || fail '补丁清单格式或路径无效。'
RESOURCE_COUNT=$(/usr/bin/wc -l < "${ROOT}/manifest.tsv" | /usr/bin/tr -d ' ')
while IFS=$'\t' read -r old new rel; do
 for root in "${APP}" "${ROOT}/payload" "${BACKUP}/files"; do
  part="${rel}"
  while [ "${part}" != . ]; do
   [ ! -L "${root}/${part}" ] || fail "资源路径不能经过符号链接：${root}/${part}"
   case "${part}" in */*) part="${part%/*}";; *) part=.;; esac
  done
 done
done < "${ROOT}/manifest.tsv"
check_payload() {
 while IFS=$'\t' read -r old new rel; do
  [ -f "${ROOT}/payload/${rel}" ] || fail "补丁文件缺失：${rel}"
  [ "$(hash "${ROOT}/payload/${rel}")" = "${new}" ] || fail "补丁文件校验失败：${rel}"
 done < "${ROOT}/manifest.tsv"
}
check_original() {
 while IFS=$'\t' read -r old new rel; do
  if [ "${old}" = '-' ]; then
   [ ! -e "${APP}/${rel}" ] || fail "检测到已有汉化或非原版文件：${rel}"
  else
   [ -f "${APP}/${rel}" ] && [ ! -L "${APP}/${rel}" ] || fail "原版文件缺失或为链接：${rel}"
   [ "$(hash "${APP}/${rel}")" = "${old}" ] || fail "原版资源不匹配：${rel}。可能已更新或安装其他汉化。"
  fi
 done < "${ROOT}/manifest.tsv"
}
rollback() {
 while IFS=$'\t' read -r old new rel; do
  if [ "${old}" = '-' ]; then /bin/rm -f "${APP}/${rel}"; else /bin/cp -p "${BACKUP}/files/${rel}" "${APP}/${rel}"; fi
 done < "${BACKUP}/manifest.tsv"
 /bin/rmdir "${APP}/Contents/Resources/zh-Hans.lproj" 2>/dev/null || true
}
if [ "${MODE}" = --restore ]; then
 echo '正在检查恢复备份和当前资源，请稍候…'
 [ -f "${BACKUP}/complete" ] || fail '此应用路径没有完整备份，不能自动恢复。'
 /usr/bin/cmp -s "${BACKUP}/manifest.tsv" "${ROOT}/manifest.tsv" || fail '备份属于另一版补丁，请使用对应恢复工具。'
 while IFS=$'\t' read -r old new rel; do
  if [ "${old}" != '-' ]; then
   [ -f "${BACKUP}/files/${rel}" ] && [ "$(hash "${BACKUP}/files/${rel}")" = "${old}" ] || fail "备份损坏：${rel}"
  fi
  [ -f "${APP}/${rel}" ] && [ "$(hash "${APP}/${rel}")" = "${new}" ] || fail "应用已更新或另有修改，停止恢复以免覆盖：${rel}"
  [ -w "${APP}/${rel}" ] || fail "没有写入权限：${rel}"
 done < "${ROOT}/manifest.tsv"
 if [ "${INTERACTIVE}" = 1 ]; then confirm_action '恢复所选应用的原版资源？'; fi
 echo '正在恢复原版资源…'
 rollback
 echo '正在验证原版资源及官方签名…'
 check_original
 /usr/bin/codesign --verify --deep --strict "${APP}" || fail '资源已恢复，但完整签名检查失败，请从保留的原版安装包重新安装。'
 /bin/mv "${BACKUP}" "${BACKUP}.restored.$(/bin/date +%Y%m%d-%H%M%S).$$"
 echo '恢复成功，原版资源与完整签名检查通过。备份已归档。'
 exit 0
fi
check_payload
check_original
/usr/bin/codesign --verify --deep --strict "${APP}" || fail '完整官方签名检查失败，请使用干净原版。'
if [ "${MODE}" = --check ]; then echo "检查通过：版本、原生程序、${RESOURCE_COUNT} 个目标资源及补丁内容均匹配。尚未修改应用。"; exit 0; fi
[ ! -e "${BACKUP}" ] || fail "该路径已有备份，停止以免覆盖：${BACKUP}"
[ -w "${APP}/Contents/Resources" ] || fail '当前账户无权修改此应用，请将原版放到自己可写的位置后重试。'
while IFS=$'\t' read -r old new rel; do
 if [ "${old}" != '-' ]; then [ -w "${APP}/${rel}" ] || fail "没有写入权限：${rel}"; fi
done < "${ROOT}/manifest.tsv"
if [ "${INTERACTIVE}" = 1 ]; then confirm_action '应用到上述原版并创建备份？'; fi
umask 077
/bin/mkdir -p "${BACKUP}/files"
/bin/cp "${ROOT}/manifest.tsv" "${BACKUP}/manifest.tsv"
printf '%s\n' "${APP}" > "${BACKUP}/app-path.txt"
while IFS=$'\t' read -r old new rel; do
 if [ "${old}" != '-' ]; then
  /bin/mkdir -p "${BACKUP}/files/$(dirname "${rel}")"
  /bin/cp -p "${APP}/${rel}" "${BACKUP}/files/${rel}"
  [ "$(hash "${BACKUP}/files/${rel}")" = "${old}" ] || fail "备份校验失败：${rel}；应用尚未修改。"
 fi
done < "${ROOT}/manifest.tsv"
touch "${BACKUP}/complete"
on_error() {
 code=$?; trap - EXIT INT TERM
 if [ "${code}" != 0 ]; then echo '安装未完成，正在回滚原版资源。' >&2; rollback; echo "备份保留在：${BACKUP}" >&2; fi
 exit "${code}"
}
trap on_error EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
umask 022
while IFS=$'\t' read -r old new rel; do
 /bin/mkdir -p "${APP}/$(dirname "${rel}")"
 /bin/cp "${ROOT}/payload/${rel}" "${APP}/${rel}"
 [ "$(hash "${APP}/${rel}")" = "${new}" ] || fail "写入校验失败：${rel}"
done < "${ROOT}/manifest.tsv"
trap - EXIT INT TERM
echo '汉化资源安装完成，全部目标文件校验通过。'
echo "备份：${BACKUP}"
echo '现在可打开 Raycast。若 macOS 拦截，请参考说明；不要关闭全局安全保护。'
