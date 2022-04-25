import { VoidFn } from "./queue";

export enum Sides {
  TopLeft = "top-left",
  TopRight = "top-right",
  BottomLeft = "bottom-left",
  BottomRight = "bottom-right",
}

export class Balloon {
  private static readonly WORD_SPEAK_TIME = 200;
  private static readonly CLOSE_BALLOON_DELAY = 2000;
  private static readonly BALLOON_MARGIN = 15;

  private _content: HTMLDivElement;
  private _targetEl: HTMLDivElement;
  private _hidden = true;
  private _balloon: HTMLDivElement;
  private _complete: VoidFn | undefined;
  private _hiding: number | null = null;
  private _active: boolean = false;
  private _hold: boolean = false;
  private _addWord: VoidFn | null = null;
  private _loop: number | undefined;

  constructor(targetEl: HTMLDivElement) {
    this._targetEl = targetEl;

    this._balloon = document.createElement("div");
    this._balloon.classList.add("clippy-balloon");
    this._balloon.style.display = "none";

    const nodeTip = document.createElement("div");
    nodeTip.classList.add("clippy-tip");

    this._content = document.createElement("div");
    this._content.classList.add("clippy-content");

    this._balloon.append(nodeTip, this._content);
    document.body.append(this._balloon);
  }

  reposition() {
    var minOut=100000;
    var s: Sides = Sides.TopLeft;
    for (const side in Sides) {
      if (typeof side === "number") {
        this._position(side);
        const out = this._isOut();
        if (out < minOut) {
          minOut = out;
          s = side;
          if (!out) break;
        }
      }
    }
    if (minOut) {
      this._position(s);
      var pos={top: this._balloon.offsetTop, left: this._balloon.offsetLeft};
      if (pos.top<0) pos.top=5;
      if (pos.top>window.visualViewport.height-this._balloon.offsetHeight-5)
        pos.top = window.visualViewport.height - this._balloon.offsetHeight - 5;
      if (pos.left<0) pos.left=5;
      if (pos.left>window.visualViewport.width-this._balloon.offsetWidth-5)
        pos.left=window.visualViewport.width-this._balloon.offsetWidth-5;
      this._balloon.style.top = `${pos.top}px`;
      this._balloon.style.left = `${pos.left}px`;
      this._balloon.classList.add("clippy-" + s);
  }
}

  speak(complete: VoidFn, text: string, hold?: boolean) {
    this._hidden = false;
    this.show();
    // set height to auto
    this._content.style.height = "auto";
    this._content.style.width = "auto";
    // add the text
    this._content.replaceChildren(document.createTextNode(text));
    // set height
    this._content.style.height = getComputedStyle(this._content, null).height;
    this._content.style.width = getComputedStyle(this._content, null).width;
    this._content.replaceChildren();
    this.reposition();

    this._complete = complete;
    this._sayWords(text, !!hold, complete);
  }

  show() {
    if (this._hidden) return;
    this._balloon.style.display = "";
  }

  hide(fast: boolean = false) {
    if (fast) {
      this._balloon.style.display = "none";
      return;
    }

    this._hiding = window.setTimeout(
      this._finishHideBalloon.bind(this),
      Balloon.CLOSE_BALLOON_DELAY
    );
  }

  close() {
    if (this._active) {
      this._hold = false;
    } else if (this._hold && this._complete) {
      this._complete();
    }
  }

  pause() {
    window.clearTimeout(this._loop);
    if (this._hiding) {
      window.clearTimeout(this._hiding);
      this._hiding = null;
    }
  }

  resume() {
    if (this._addWord) {
      this._addWord();
    } else if (!this._hold && !this._hidden) {
      this._hiding = window.setTimeout(
        this._finishHideBalloon.bind(this),
        Balloon.CLOSE_BALLOON_DELAY
      );
    }
  }

  private _position(side: Sides) {
    const o = this._targetEl.getBoundingClientRect();
    const h = parseFloat(
      getComputedStyle(this._targetEl, null).height.replace("px", "")
    );
    const w = parseFloat(
      getComputedStyle(this._targetEl, null).width.replace("px", "")
    );

    const bH = this._balloon.offsetHeight;
    const bW = this._balloon.offsetWidth;

    this._balloon.classList.remove(
      "clippy-top-left",
      "clippy-top-right",
      "clippy-bottom-right",
      "clippy-bottom-left"
    );

    let left: number, top: number;
    switch (side) {
      case Sides.TopLeft:
        // right side of the balloon next to the right side of the agent
        left = o.left + w - bW;
        top = o.top - bH - Balloon.BALLOON_MARGIN;
        break;
      case Sides.TopRight:
        // left side of the balloon next to the left side of the agent
        left = o.left;
        top = o.top - bH - Balloon.BALLOON_MARGIN;
        break;
      case Sides.BottomRight:
        // right side of the balloon next to the right side of the agent
        left = o.left;
        top = o.top + h + Balloon.BALLOON_MARGIN;
        break;
      case Sides.BottomLeft:
        // left side of the balloon next to the left side of the agent
        left = o.left + w - bW;
        top = o.top + h + Balloon.BALLOON_MARGIN;
        break;
    }

    this._balloon.style.top = `${top}px`;
    this._balloon.style.left = `${left}px`;
    this._balloon.classList.add("clippy-" + side);
  }

  private _isOut() {
    const o = this._balloon.getBoundingClientRect();
    const bH = this._balloon.offsetHeight;
    const bW = this._balloon.offsetWidth;
    const wW = window.innerWidth;
    const wH = window.innerHeight;

    const m = 5;
    var outX=0;
    var outY=0;
    if (o.top - m < 0) outY= (m - o.top)/wH;
    if (o.left - m < 0) outX= (m-o.left)/wH;
    if ((o.top + bH + m) > wH) outY= o.top + bH + m/wH-1;
    if ((o.left + bW + m) > wW) outX= o.left + bW + m/wW-1;

    return Math.sqrt(outX*outX+outY*outY);
  }

  private _finishHideBalloon() {
    if (this._active) return;
    this._balloon.style.display = "none";
    this._hidden = true;
    this._hiding = null;
  }

  private _sayWords(text: string, hold: boolean, complete: VoidFn) {
    this._active = true;
    this._hold = hold;
    const words = text.split(/[^\S-]/);
    const time = Balloon.WORD_SPEAK_TIME;
    let idx = 1;

    const addWord = () => {
      if (!this._active) return;
      if (idx > words.length) {
        this._addWord = null;
        this._active = false;
        if (!this._hold) {
          complete();
          this.hide();
        }
      } else {
        this._content.replaceChildren(
          document.createTextNode(words.slice(0, idx).join(" "))
        );
        idx++;
        this._loop = window.setTimeout(addWord.bind(this), time);
      }
    };

    this._addWord = addWord;
    this._addWord();
  }
}
