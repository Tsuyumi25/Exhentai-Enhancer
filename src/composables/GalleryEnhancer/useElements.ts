import { getElement } from '@/utils/commons'

export default function() {
  const infoDiv = getElement('.gm') as HTMLElement
  const archiveLinkAnchor = getElement('#gd5 > p:nth-child(2) a') as HTMLElement
  const torrentLinkAnchor = getElement('#gd5 > p:nth-child(3) a') as HTMLElement
  const favoritesLinkAnchor = getElement('#favoritelink') as HTMLElement
  const favoritesLinkDiv = getElement('#gdf') as HTMLElement

  return {
    infoDiv,
    archiveLinkAnchor,
    torrentLinkAnchor,
    favoritesLinkAnchor,
    favoritesLinkDiv,
  }
}
