//
// Author(s):
// Fr. Matthew Spencer, OSJ <mspencer@osjusa.org>
//
// Copyright (c) 2008-2016 Fr. Matthew Spencer, OSJ
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

export const Units = {
  // enums
  DeviceIndepenedent: 0, // device independent units: 96/inch
  Centimeters: 1,
  Millimeters: 2,
  Inches: 3,

  // constants for device independent units (diu)
  DIU_PER_INCH: 96,
  DIU_PER_CENTIMETER: 96 / 2.54,

  ToDeviceIndependent(n: number, inputUnits: number): number {
    switch (inputUnits) {
      case Units.Centimeters:
        return n * Units.DIU_PER_CENTIMETER;
      case Units.Millimeters:
        return n * Units.DIU_PER_CENTIMETER / 10;
      case Units.Inches:
        return n * Units.DIU_PER_INCH;
      default:
        return n;
    }
  },

  FromDeviceIndependent(n: number, outputUnits: number): number {
    switch (outputUnits) {
      case Units.Centimeters:
        return n / Units.DIU_PER_CENTIMETER;
      case Units.Millimeters:
        return n / Units.DIU_PER_CENTIMETER * 10;
      case Units.Inches:
        return n / Units.DIU_PER_INCH;
      default:
        return n;
    }
  },

  StringToUnitsType(s: string): number {
    switch (s.toLowerCase()) {
      case "in":
      case "inches":
        return Units.Inches;

      case "cm":
      case "centimeters":
        return Units.Centimeters;

      case "mm":
      case "millimeters":
        return Units.Millimeters;

      case "di":
      case "device-independent":
        return Units.DeviceIndepenedent;

      default:
        return Units.DeviceIndepenedent;
    }
  },

  UnitsTypeToString(units: number): string {
    switch (units) {
      case Units.Inches: return "in";
      case Units.Centimeters: return "cm";
      case Units.Millimeters: return "mm";
      case Units.DeviceIndepenedent: return "device-independent";
      default: return "device-independent";
    }
  }
};

export function DeviceIndependent(n: number): number {
  return n;
}

export function Centimeters(n: number): number {
  return Units.ToDeviceIndependent(n, Units.Centimeters);
}

export function Millimeters(n: number): number {
  return Units.ToDeviceIndependent(n, Units.Millimeters);
}

export function Inches(n: number): number {
  return Units.ToDeviceIndependent(n, Units.Inches);
}

export function ToCentimeters(n: number): number {
  return Units.FromDeviceIndependent(n, Units.Centimeters);
}

export function ToMillimeters(n: number): number {
  return Units.FromDeviceIndependent(n, Units.Millimeters);
}

export function ToInches(n: number): number {
  return Units.FromDeviceIndependent(n, Units.Inches);
}


/*
 * Point
 */
export class Point {
  x: number;
  y: number;

  constructor(x?: number, y?: number) {
    this.x = (typeof x !== 'undefined') ? x : 0;
    this.y = (typeof y !== 'undefined') ? y : 0;
  }

  clone(): Point {
    return new Point(this.x, this.y);
  }

  equals(point: Point): boolean {
    return this.x === point.x && this.y === point.y;
  }
}

/*
 * Rect
 */
export class Rect {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    this.x = (typeof x !== 'undefined') ? x : Infinity;
    this.y = (typeof y !== 'undefined') ? y : Infinity;
    this.width = (typeof width !== 'undefined') ? width : -Infinity;
    this.height = (typeof height !== 'undefined') ? height : -Infinity;
  }

  clone(): Rect {
    return new Rect(this.x, this.y, this.width, this.height);
  }

  isEmpty(): boolean {
    return (this.x === Infinity &&
            this.y === Infinity &&
            this.width === -Infinity &&
            this.height === -Infinity);
  }

  // convenience method
  right(): number {
    return this.x + this.width;
  }

  bottom(): number {
    return this.y + this.height;
  }

  equals(rect: Rect): boolean {
    return this.x === rect.x && this.y === rect.y &&
           this.width === rect.width && this.height === rect.height;
  }

  // other can be a Point or a Rect
  contains(other: Point | Rect): boolean {
    if (other instanceof Point) {
      return other.x >= this.x &&
              other.x <= this.x + this.width &&
              other.y >= this.y &&
              other.y <= this.y + this.height;
    } else { // better be instance of Rect
      return this.x <= other.x &&
              this.x + this.width >= other.x + other.width &&
              this.y <= other.y &&
              this.y + this.height >= other.y + other.height;
    }
  }

  union(rect: Rect): void {

    var right = Math.max(this.x + this.width, rect.x + rect.width);
    var bottom = Math.max(this.y + this.height, rect.y + rect.height);

    this.x = Math.min(this.x, rect.x);
    this.y = Math.min(this.y, rect.y);

    this.width = right - this.x;
    this.height = bottom - this.y;
  }
}

/**
 * Margins
 *
 * @class
 */
export class Margins {
  left: number;
  top: number;
  right: number;
  bottom: number;

  constructor(left?: number, top?: number, right?: number, bottom?: number) {
    this.left = (typeof left !== 'undefined') ? left : 0;
    this.top = (typeof top !== 'undefined') ? top : 0;
    this.right = (typeof right !== 'undefined') ? right : 0;
    this.bottom = (typeof bottom !== 'undefined') ? bottom : 0;
  }

  clone(): Margins {
    return new Margins(this.left, this.top, this.right, this.bottom);
  }

  equals(margins: Margins): boolean {
    return this.left === margins.left &&
        this.top === margins.top &&
        this.right === margins.right &&
        this.bottom === margins.bottom;
  }
}

/**
 * Size
 *
 * @class
 */
export class Size {
  width: number;
  height: number;

  constructor(width?: number, height?: number) {
    this.width = (typeof width !== 'undefined') ? width : 0;
    this.height = (typeof height !== 'undefined') ? height : 0;
  }

  clone(): Size {
    return new Size(this.width, this.height);
  }

  equals(size: Size): boolean {
    return this.width === size.width && this.height === size.height;
  }
}


/*
 * Pitches, notes
 */
export const Step = {
  Do: 0,
  Du: 1,
  Re: 2,
  Me: 3,
  Mi: 4,
  Fa: 5,
  Fu: 6,
  So: 7,
  La: 9,
  Te: 10,
  Ti: 11
};

  // this little array helps map step values to staff positions. The numeric values of steps
  // correspond to whole step increments (2) or half step increments (1). This gives us the ability
  // to compare pitches precisely, but makes it challenging to place steps on the staff. this little
  // array maps the steps to an incremental position the steps take on the staff line. This works
  // so simply because chant only uses do and fa clefs, and only has a flatted ti (te), making
  // for relatively easy mapping to staff line locations.
  //                         Do Du Re Me Mi Fa Fu So    La Te Ti
const __StepToStaffPosition = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 6, 6];
const __StaffOffsetToStep = [Step.Do, Step.Re, Step.Mi, Step.Fa, Step.So, Step.La, Step.Ti]; // no accidentals in this one


export class Pitch {
  step: number;
  octave: number;

  constructor(step: number, octave: number) {
    this.step = step;
    this.octave = octave;
  }

  toInt(): number {
    return this.octave * 12 + this.step;
  }

  isHigherThan(pitch: Pitch): boolean {
    return this.toInt() > pitch.toInt();
  }

  isLowerThan(pitch: Pitch): boolean {
    return this.toInt() < pitch.toInt();
  }

  equals(pitch: Pitch): boolean {
    return this.toInt() === pitch.toInt();
  }

  static stepToStaffOffset(step: number): number {
    return __StepToStaffPosition[step];
  }

  static staffOffsetToStep(offset: number): number {
    while (offset < 0)
      offset = __StaffOffsetToStep.length + offset;

    return __StaffOffsetToStep[offset % __StaffOffsetToStep.length];
  }
}

export function generateRandomGuid(): string {
  function s4(): string {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4();
}
