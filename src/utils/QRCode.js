import QrImage from 'qr-image'

class QRCode {
    /**
     *  Builds a QR Code image uri from the string given
     *
     *  @param    {String}     content      data string
     *  @param    {String}     type         image type. default: 'png'  
     *  @return   {String}                  image URI
     */
    static getQRUri(content, type = 'png') {
        const imgBuffer = QrImage.imageSync(data, { type })
        return `data:image/${type};charset=utf-8;base64,${imgBuffer.toString('base64')}`
    }
}

export { QRCode }