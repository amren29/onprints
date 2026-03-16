import { PrintSpecs, ArtworkAnalysis } from '@/types/store'

const VECTOR_EXTENSIONS = /\.(ai|eps|svg|cdr)$/i
const RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function getFileFormat(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase() ?? ''
  if (file.type === 'image/jpeg') return 'JPEG'
  if (file.type === 'image/png') return 'PNG'
  if (file.type === 'application/pdf') return 'PDF'
  return ext || 'Unknown'
}

export function isVectorFile(file: File): boolean {
  return VECTOR_EXTENSIONS.test(file.name)
}

export function isRasterFile(file: File): boolean {
  return RASTER_TYPES.includes(file.type)
}

export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function qualityRating(
  dpi: number,
  minDpi: number
): ArtworkAnalysis['qualityRating'] {
  if (dpi >= minDpi) return 'excellent'
  if (dpi >= minDpi * 0.6) return 'acceptable'
  return 'poor'
}

function buildWarnings(
  dpi: number,
  widthPx: number,
  heightPx: number,
  printSpecs: PrintSpecs
): string[] {
  const warnings: string[] = []

  if (dpi < printSpecs.minDpi) {
    warnings.push(
      `Resolution is ${dpi} DPI — ${printSpecs.minDpi} DPI required for quality printing. Please upload a higher resolution file.`
    )
  }

  // Expected pixel dimensions for bleed-to-bleed area
  const expectedWMm = printSpecs.trimWidthMm + printSpecs.bleedMm * 2
  const expectedHMm = printSpecs.trimHeightMm + printSpecs.bleedMm * 2
  const expectedWPx = (expectedWMm / 25.4) * dpi
  const expectedHPx = (expectedHMm / 25.4) * dpi

  if (widthPx < expectedWPx * 0.9 || heightPx < expectedHPx * 0.9) {
    warnings.push(
      `Artwork doesn't fill the bleed area. White edges may appear after cutting.`
    )
  }

  // Aspect ratio check (allow ±15% tolerance)
  const artAspect = widthPx / heightPx
  const productAspect = printSpecs.trimWidthMm / printSpecs.trimHeightMm
  if (Math.abs(artAspect - productAspect) / productAspect > 0.15) {
    const artWMm = Math.round((widthPx / dpi) * 25.4)
    const artHMm = Math.round((heightPx / dpi) * 25.4)
    warnings.push(
      `Artwork is ${artWMm}×${artHMm}mm but product requires ${printSpecs.trimWidthMm}×${printSpecs.trimHeightMm}mm. Aspect ratio mismatch may cause cropping.`
    )
  }

  if (dpi > printSpecs.minDpi * 5) {
    warnings.push(
      `Artwork resolution is very high (${dpi} DPI). File may be slow to process.`
    )
  }

  return warnings
}

/**
 * Analyse a raster or PDF/vector file client-side.
 * Returns analysis + a data URL for display in the proofing canvas.
 */
export async function analyzeArtwork(
  file: File,
  printSpecs: PrintSpecs
): Promise<{ analysis: ArtworkAnalysis; imageUrl: string }> {
  return new Promise((resolve, reject) => {
    // Vector files — no pixel analysis possible
    if (isVectorFile(file)) {
      resolve({
        analysis: {
          widthPx: 0,
          heightPx: 0,
          dpi: 9999,
          colorMode: 'Unknown',
          fileFormat: getFileFormat(file),
          dimensionsMm: { width: printSpecs.trimWidthMm, height: printSpecs.trimHeightMm },
          qualityRating: 'vector',
          warnings: [],
        },
        imageUrl: '',
      })
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string

      // PDF — can't render easily client-side; show placeholder
      if (isPDFFile(file)) {
        resolve({
          analysis: {
            widthPx: 0,
            heightPx: 0,
            dpi: 300,
            colorMode: 'Unknown',
            fileFormat: 'PDF',
            dimensionsMm: { width: printSpecs.trimWidthMm, height: printSpecs.trimHeightMm },
            qualityRating: 'excellent',
            warnings: [
              'PDF detected. Full resolution analysis requires server-side processing. Assuming print-ready if exported from a design tool at correct dimensions.',
            ],
          },
          imageUrl: dataUrl,
        })
        return
      }

      // Raster (JPG / PNG)
      if (isRasterFile(file)) {
        const img = new Image()
        img.onload = () => {
          const widthPx = img.naturalWidth
          const heightPx = img.naturalHeight

          // Effective DPI = pixels ÷ print size in inches
          const trimWidthIn = printSpecs.trimWidthMm / 25.4
          const dpiW = widthPx / trimWidthIn
          const trimHeightIn = printSpecs.trimHeightMm / 25.4
          const dpiH = heightPx / trimHeightIn
          const dpi = Math.round(Math.min(dpiW, dpiH))

          const artWMm = Math.round((widthPx / dpi) * 25.4)
          const artHMm = Math.round((heightPx / dpi) * 25.4)
          const warnings = buildWarnings(dpi, widthPx, heightPx, printSpecs)

          resolve({
            analysis: {
              widthPx,
              heightPx,
              dpi,
              colorMode: 'RGB',
              fileFormat: getFileFormat(file),
              dimensionsMm: { width: artWMm, height: artHMm },
              qualityRating: qualityRating(dpi, printSpecs.minDpi),
              warnings,
            },
            imageUrl: dataUrl,
          })
        }
        img.onerror = () => reject(new Error('Could not load image for analysis.'))
        img.src = dataUrl
        return
      }

      reject(new Error('Unsupported file format.'))
    }

    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}
