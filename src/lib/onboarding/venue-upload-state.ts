let pendingCover: File | null = null
let pendingGallery: File[] = []

export function setPendingPhotos(cover: File | null, gallery: File[]) {
  pendingCover = cover
  pendingGallery = gallery
}

export function getPendingPhotos(): { cover: File | null; gallery: File[] } {
  return { cover: pendingCover, gallery: pendingGallery }
}

export function clearPendingPhotos() {
  pendingCover = null
  pendingGallery = []
}
