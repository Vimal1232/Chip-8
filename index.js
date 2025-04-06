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

const file = fetch("/IBM2.ch8")
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
        ctx.fillStyle = "white";
        ctx.fillRect(x * 10, y * 10, 10, 10);
      } else {
        ctx.fillStyle = "black";
        ctx.fillRect(x * 10, y * 10, 10, 10);
      }
    }
  }

  requestAnimationFrame(draw);
}
