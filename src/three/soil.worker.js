// Genera las texturas de suelo fuera del hilo principal (OffscreenCanvas)
// y las devuelve como ImageBitmap transferibles.
import { drawField, drawSoilDetail, drawSoilProfile } from './soilDraw.js'
import { DETAIL, SOIL_PX } from './soilSpec.js'

self.onmessage = async ({ data }) => {
  try {
    const px = SOIL_PX[data.quality] ?? SOIL_PX.high
    const profile = drawSoilProfile({ px: px.profile })
    const detail = drawSoilDetail(profile, { rect: DETAIL, px: px.detail })
    const field = drawField({ px: px.field })
    const bitmaps = {
      profile: profile.transferToImageBitmap(),
      detail: detail.transferToImageBitmap(),
      field: field.transferToImageBitmap(),
    }
    self.postMessage({ ok: true, bitmaps }, Object.values(bitmaps))
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) })
  }
}
