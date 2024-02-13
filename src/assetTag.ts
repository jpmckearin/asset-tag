import { printDirect } from '@thiagoelg/node-printer'
import PDFDocument from 'pdfkit'
import { UUID } from 'node:crypto'
import fs from 'fs'
import SVGtoPDF from 'svg-to-pdfkit'
import QRCode from 'qrcode-svg'
import { pdf } from 'pdf-to-img'

class PDFDocumentWithSvg extends PDFDocument {
  addSVG(
    svg: string,
    x: number,
    y: number,
    options: SVGtoPDF.Options
  ): PDFKit.PDFDocument {
    return SVGtoPDF(this, svg, x, y, options), this
  }
}

const createAssetTag = async (assetId: UUID): Promise<Buffer> => {
  const fontName = 'src/fonts/Stencilia-A.ttf'
  const imagePath = 'src/images/hawks-logo.svg'

  const docWidth = 144,
    docHeight = 72,
    margin = 6,
    bottomMargin = 0,
    preserveAspectRatio = 'xMidYMid meet'

  const doc = new PDFDocumentWithSvg({
    compress: true,
    size: [docWidth, docHeight], // 72 points per inch
    margins: {
      top: margin,
      bottom: bottomMargin,
      left: margin,
      right: margin,
    },
    font: fontName,
  })

  const imageData = fs.readFileSync(imagePath, 'utf8')

  doc
    .fontSize(8)
    .text('PROPERTY OF', 10)
    .addSVG(imageData, 4, 1, {
      width: 64,
      preserveAspectRatio,
    })
    .fontSize(6)
    .text('SPRING HILL HAWKS', 7, 60)

  const qrCode = new QRCode({
    content: assetId,
    padding: 0,
    width: 70,
    height: 70,
    color: '#000000',
    background: '#ffffff',
    ecl: 'H',
  })

  doc.addSVG(qrCode.svg(), 78, 1, {
    width: 58,
    preserveAspectRatio,
  })

  doc.flushPages()
  doc.end()

  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<Buffer>()

    doc.on('data', (chunk) => _buf.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(_buf)))
    doc.on('error', (err) => reject(`error converting stream - ${err}`))
  })
}

export const printAssetTag = async (assetId: UUID) => {
  const printerName = '_PM_241_BT'
  const pdfData = await createAssetTag(assetId)

  printDirect({
    printer: printerName,
    type: 'PDF',
    data: pdfData,
    error: (err: Error) => console.error(err),
  })
}

export const saveExampleAssetTag = async (assetId: UUID) => {
  const pdfData = await createAssetTag(assetId)

  fs.writeFileSync('./example/assetLabel.pdf', pdfData)
}

export const saveExampleAssetTagImage = async (assetId: UUID) => {
  const pdfData = await createAssetTag(assetId)

  // eslint-disable-next-line no-loops/no-loops
  for await (const page of await pdf(pdfData, { scale: 3 })) {
    fs.writeFileSync('./example/assetLabel.png', page)
  }
}
