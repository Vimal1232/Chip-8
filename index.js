class chip8 {
  constructor() {
    this.memory = new Uint8Array(4096);
    this.pc = 0x200;
    this.stack = [];
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.i = 0;
    this.v = new Uint8Array(16);
    this.display = new Uint8Array(64 * 32);
    this.keypad = new Uint8Array(16);
    this.fontset = [
      0xf0, 0x90, 0x90, 0x90, 0xf0, 0x20, 0x60, 0x20, 0x20, 0x70, 0xf0, 0x10,
      0xf0, 0x80, 0xf0, 0xf0, 0x10, 0xf0, 0x10, 0xf0, 0x90, 0x90, 0xf0, 0x10,
      0x10, 0xf0, 0x80, 0xf0, 0x10, 0xf0, 0xf0, 0x80, 0xf0, 0x90, 0xf0, 0xf0,
      0x10, 0x20, 0x40, 0x40, 0xf0, 0x90, 0xf0, 0x90, 0xf0, 0xf0, 0x90, 0xf0,
      0x10, 0xf0, 0xf0, 0x90, 0xf0, 0x90, 0x90, 0xe0, 0x90, 0xe0, 0x90, 0xe0,
      0xf0, 0x80, 0x80, 0x80, 0xf0, 0xe0, 0x90, 0x90, 0x90, 0xe0, 0xf0, 0x80,
      0xf0, 0x80, 0xf0, 0xf0, 0x80, 0xf0, 0x80, 0x80,
    ];

    this.fontsetLoad();
    this.mode = "cosmac";
    this.keymap = {
      1: 0x1,
      2: 0x2,
      3: 0x3,
      4: 0xc,
      q: 0x4,
      w: 0x5,
      e: 0x6,
      r: 0xd,
      a: 0x7,
      s: 0x8,
      d: 0x9,
      f: 0xe,
      z: 0xa,
      x: 0x0,
      c: 0xb,
      v: 0xf,
    };
  }

  fontsetLoad() {
    for (let i = 0; i < this.fontset.length; i++) {
      this.memory[0x50 + i] = this.fontset[i];
    }
  }

  loadrom(rom) {
    for (let i = 0; i < rom.length; i++) {
      this.memory[0x200 + i] = rom[i];
    }
  }

  fetch() {
    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.pc += 2;
    return opcode;
  }

  decode(opcode) {
    const instruction = (opcode & 0xf000) >> 12;
    const x = (opcode & 0x0f00) >> 8;
    const y = (opcode & 0x00f0) >> 4;
    const n = opcode & 0x000f;
    const nn = opcode & 0x00ff;
    const nnn = opcode & 0x0fff;

    switch (instruction) {
      case 0x0:
        if (opcode === 0x00e0) {
          this.display.fill(0);
          break;
        }

        if (opcode === 0x0ee) {
          this.pc = this.stack.pop();
          break;
        }
        break;

      case 0x1:
        this.pc = nnn;
        break;
      case 0x6:
        this.v[x] = nn;
        break;
      case 0x7:
        this.v[x] += nn;
        break;
      case 0xa:
        this.i = nnn;
        break;
      case 0x2:
        this.stack.push(this.pc);
        this.pc = nnn;
        break;

      case 0x8:
        if (n === 0) {
          this.v[x] = this.v[y];
          break;
        }

        if (n === 1) {
          this.v[x] = this.v[x] | this.v[y];
          break;
        }

        if (n === 2) {
          this.v[x] = this.v[x] & this.v[y];
          break;
        }

        if (n === 3) {
          this.v[x] = this.v[x] ^ this.v[y];
          break;
        }

        if (n === 4) {
          this.v[x] += this.v[y];
          if (this.v[x] > 255) {
            this.v[0xf] = 1;
            break;
          } else {
            this.v[0xf] = 0;
            break;
          }
        }
        if (n === 5) {
          this.v[0xf] = this.v[x] > this.v[y] ? 1 : 0;
          this.v[x] = this.v[x] - this.v[y];
          break;
        }

        if (n === 7) {
          this.v[0xf] = this.v[y] > this.v[x] ? 1 : 0;
          this.v[x] = this.v[y] - this.v[x];
          break;
        }

        if (n === 6) {
          if (this.mode === "cosmac") {
            this.v[0xf] = this.v[y] & 0x1;
            this.v[x] = this.v[y] >> 0x1;
            break;
          } else {
            this.v[0xf] = this.v[x] & 0x1;
            this.v[x] = this.v[x] >> 0x1;
            break;
          }
        }

        if (n === 0xe) {
          if (this.mode === "cosmac") {
            this.v[0xf] = (this.v[y] & 0x80) >> 7;
            this.v[x] = (this.v[y] << 0x1) & 0xff;
            break;
          } else {
            this.v[0xf] = (this.v[x] & 0x80) >> 7;
            this.v[x] = (this.v[x] << 0x1) & 0xff;
            break;
          }
        }
        break;
      case 0xb:
        this.pc = nnn + this.v[0];
        break;
      case 0xc:
        this.v[x] = Math.floor(Math.random() * 256) & nn;
        break;

      case 0x3:
        if (this.v[x] === nn) {
          this.pc += 2;
        }
        break;

      case 0x4:
        if (this.v[x] !== nn) {
          this.pc += 2;
        }
        break;
      case 0x5:
        if (this.v[x] === this.v[y]) {
          this.pc += 2;
        }
        break;
      case 0x9:
        if (this.v[x] != this.v[y]) {
          this.pc += 2;
        }
        break;

      case 0xe:
        if (n === 0xe) {
          if (this.keypad[this.v[x]]) {
            this.pc += 2;
          }
          break;
        }

        if (n === 0x1) {
          if (!this.keypad[this.v[x]]) {
            this.pc += 2;
          }
          break;
        }

      case 0xf:
        if (nn === 0x07) {
          this.v[x] = this.delayTimer;
          break;
        }

        if (nn === 0x15) {
          this.delayTimer = this.v[x];
          break;
        }

        if (nn === 0x18) {
          this.soundTimer = this.v[x];
          break;
        }

        if (nn === 0x1e) {
          this.i += this.v[x];
          break;
        }

        if (nn === 0x0a) {
          let key = false;

          for (let i = 0; i < this.keypad.length; i++) {
            if (this.keypad[i] === 1) {
              this.v[x] = i;
              key = true;
              break;
            }
          }

          if (!key) {
            this.pc -= 2;
            return;
          } else {
            this.pc += 2;
            break;
          }
        }

        if (nn === 0x29) {
          this.i = 0x50 + this.v[x] * 5;
          break;
        }

        if (nn === 0x33) {
          const first = Math.floor(this.v[x] / 100);
          const second = Math.floor((this.v[x] % 100) / 10);
          const third = Math.floor(this.v[x] % 10);

          this.memory[this.i] = first;
          this.memory[this.i + 1] = second;
          this.memory[this.i + 2] = third;
          break;
        }

        if (nn === 0x55) {
          for (let i = 0; i <= x; i++) {
            this.memory[this.i + i] = this.v[i];
          }
          break;
        }
        if (nn === 0x65) {
          for (let i = 0; i <= x; i++) {
            this.v[i] = this.memory[this.i + i];
          }
          break;
        }

      case 0xd:
        const X = this.v[x];
        const Y = this.v[y];
        this.v[0xf] = 0;

        for (let row = 0; row < n; row++) {
          const sprite = this.memory[this.i + row];
          for (let col = 0; col < 8; col++) {
            if (((sprite >> (7 - col)) & 1) == 1) {
              const DrawX = (X + col) % 64;
              const DrawY = (Y + row) % 32;

              const index = DrawX + DrawY * 64;
              const currentPixel = this.display[index];
              const newPixel = currentPixel ^ 1;
              this.display[index] = newPixel;

              if (currentPixel == 1 && newPixel == 0) {
                this.v[0xf] = 1;
              }
            }
          }
        }
        break;
      default:
        break;
    }
  }

  cycle() {
    const opcode = this.fetch();
    this.decode(opcode);
  }

  start() {
    setInterval(() => {
      this.cycle();
    }, 1);
  }
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const Emu = new chip8();

window.addEventListener("keydown", (e) => {
  const key = Emu.keymap[e.key];
  if (key !== null) Emu.keypad[key] = 1;
});

window.addEventListener("keyup", (e) => {
  const key = Emu.keymap[e.key];
  if (key !== null) Emu.keypad[key] = 0;
});

const file = fetch("/octo.ch8")
  .then((response) => response.arrayBuffer())
  .then((data) => {
    const rom = new Uint8Array(data);
    Emu.loadrom(rom);
    Emu.start();
    draw();
  });

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 64; x++) {
      const index = x + y * 64;
      const pixel = Emu.display[index];
      if (pixel) {
        ctx.fillStyle = "Green";
        ctx.fillRect(x * 10, y * 10, 10, 10);
      } else {
        ctx.fillStyle = "black";
        ctx.fillRect(x * 10, y * 10, 10, 10);
      }
    }
  }
  requestAnimationFrame(draw);
}
