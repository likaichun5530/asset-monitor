export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 128

export function validateChangePasswordForm({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword) return '请输入当前密码'
  if (!newPassword) return '请输入新密码'
  if (newPassword.length < PASSWORD_MIN_LENGTH) return `新密码不能少于 ${PASSWORD_MIN_LENGTH} 位`
  if (newPassword.length > PASSWORD_MAX_LENGTH) return `新密码不能超过 ${PASSWORD_MAX_LENGTH} 位`
  if (!newPassword.trim()) return '新密码不能全部为空格'
  if (newPassword !== confirmPassword) return '两次输入的新密码不一致'
  if (newPassword === currentPassword) return '新密码不能与当前密码相同'
  return ''
}
