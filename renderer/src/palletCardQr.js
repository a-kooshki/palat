const WEBSITE_URL = 'https://agse.ir/';

// QR modules for WEBSITE_URL with high error correction. Keeping the matrix in
// the app lets pallet cards be generated without an internet connection.
const WEBSITE_QR_MODULES = [
  '11111110011101110011001111111', '10000010110111101110101000001',
  '10111010001101000111101011101', '10111010001000000011101011101',
  '10111010000111011010001011101', '10000010110111100011001000001',
  '11111110101010101010101111111', '00000000111111001111100000000',
  '00001111000011110011001100010', '10011001010100010001110011011',
  '11111010100100011000110001001', '10000001000100101010010101011',
  '00111011000100111011100100001', '00010001101110101010001010101',
  '11000111010100100000100010001', '01111000111110000000010101010',
  '01001011000011110011111010011', '11110100111001011011000101101',
  '00101111000011011011000110101', '00011101000111000111100010011',
  '11001010111111100010111111000', '00000000100000101001100010101',
  '11111110110001000001101010011', '10000010100111100011100011001',
  '10111010101101000001111110010', '10111010000100001010000100010',
  '10111010001101111001110001111', '10000010000000000101011100011',
  '11111110000100101111110011110'
];

export const createPalletCardQrCode = () => {
  const moduleSize = 6;
  const quietZone = 4;
  const canvasSize = (WEBSITE_QR_MODULES.length + quietZone * 2) * moduleSize;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = canvasSize;
  canvas.height = canvasSize;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvasSize, canvasSize);
  context.fillStyle = '#000000';

  WEBSITE_QR_MODULES.forEach((row, rowIndex) => {
    [...row].forEach((module, columnIndex) => {
      if (module === '1') {
        context.fillRect(
          (columnIndex + quietZone) * moduleSize,
          (rowIndex + quietZone) * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    });
  });

  return canvas.toDataURL('image/png');
};

export { WEBSITE_URL };
