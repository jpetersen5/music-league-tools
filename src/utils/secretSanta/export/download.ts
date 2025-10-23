/**
 * Download content as a text file
 * Creates a blob, generates download link, and triggers download
 *
 * @param content - Text content to download
 * @param filename - Name of the file to download
 */
export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
