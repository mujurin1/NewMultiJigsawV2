import type { Pixel } from "./pixel";

export class Image {
  // @ts-ignore
  width: number;
  // @ts-ignore
  height: number;
  // @ts-ignore
  data: Uint8Array;


  constructor(imageData?: ImageData) {
    if(imageData != undefined){
      this.width = imageData.width;
      this.height = imageData.height;
      this.data = new Uint8Array(imageData.data);
    }
  }

  getPixel(x: number, y: number): Pixel {
    const index = x + (y * this.width);
    const rntVal: Pixel = {
      r: this.data[index * 4],
      g: this.data[index * 4 + 1],
      b: this.data[index * 4 + 2],
      a: this.data[index * 4 + 3],
    };
    return rntVal;
  }
  setPixel(x: number, y: number, pix: Pixel) {
    const index = x + (y * this.width);
    this.data[index * 4] = pix.r;
    this.data[index * 4 + 1] = pix.g;
    this.data[index * 4 + 2] = pix.b;
    this.data[index * 4 + 3] = pix.a;
  }
}
