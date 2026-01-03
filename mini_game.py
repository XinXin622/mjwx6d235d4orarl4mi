#!/usr/bin/env python3
from __future__ import annotations

import json
import random
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Literal


SCORES_PATH = Path(__file__).with_name(".alma_mini_game_scores.json")


def clear_screen() -> None:
    print("\033[2J\033[H", end="")


def hr(char: str = "-", width: int = 60) -> str:
    if not char:
        char = "-"
    return char[0] * width


def box(lines: list[str], *, title: str | None = None, width: int = 60) -> str:
    width = max(width, 20)
    inner = width - 4
    top = "+-" + ("-" * inner) + "-+"
    bottom = top
    rendered: list[str] = [top]
    if title:
        t = f"[ {title.strip()} ]"
        if len(t) > inner:
            t = t[: inner - 1] + "…"
        pad_left = (inner - len(t)) // 2
        pad_right = inner - len(t) - pad_left
        rendered.append("| " + (" " * pad_left) + t + (" " * pad_right) + " |")
        rendered.append("| " + ("-" * inner) + " |")

    for line in lines:
        s = line.rstrip("\n")
        if len(s) > inner:
            s = s[: inner - 1] + "…"
        rendered.append("| " + s.ljust(inner) + " |")
    rendered.append(bottom)
    return "\n".join(rendered)


def pause(text: str = "回车继续...") -> None:
    prompt(text)

def gauge(value: int, lo: int, hi: int, *, width: int = 28) -> str:
    width = max(width, 10)
    if hi <= lo:
        idx = 0
    else:
        idx = int(round((value - lo) / (hi - lo) * (width - 1)))
        idx = max(0, min(width - 1, idx))
    bar = ["-"] * width
    bar[idx] = "|"
    return "[" + "".join(bar) + "]"


def prompt_int_or_back(
    text: str,
    *,
    min_value: int | None = None,
    max_value: int | None = None,
    back_tokens: tuple[str, ...] = ("0", "b", "B"),
) -> int | None:
    while True:
        raw = prompt(text).strip()
        if raw in back_tokens:
            return None
        try:
            value = int(raw)
        except ValueError:
            print("请输入整数（或 0 返回）。")
            continue

        if min_value is not None and value < min_value:
            print(f"请输入 >= {min_value} 的整数。")
            continue
        if max_value is not None and value > max_value:
            print(f"请输入 <= {max_value} 的整数。")
            continue
        return value


BANNER = [
    "    _    _                 ____        _   _                 ",
    "   / \\  | | _ __ ___   __ |  _ \\ _   _| |_| |__   ___  _ __ ",
    "  / _ \\ | || '_ ` _ \\ / _`| |_) | | | | __| '_ \\ / _ \\| '__|",
    " / ___ \\| || | | | | | (_ |  __/| |_| | |_| | | | (_) | |   ",
    "/_/   \\_\\_||_| |_| |_|\\__,|_|    \\__, |\\__|_| |_|\\___/|_|   ",
    "                                 |___/                      ",
]


def prompt(text: str) -> str:
    try:
        return input(text)
    except (EOFError, KeyboardInterrupt):
        print()
        raise SystemExit(0)


def prompt_int(text: str, *, min_value: int | None = None, max_value: int | None = None) -> int:
    while True:
        raw = prompt(text).strip()
        try:
            value = int(raw)
        except ValueError:
            print("请输入整数。")
            continue

        if min_value is not None and value < min_value:
            print(f"请输入 >= {min_value} 的整数。")
            continue
        if max_value is not None and value > max_value:
            print(f"请输入 <= {max_value} 的整数。")
            continue
        return value


def load_scores() -> dict[str, object]:
    if not SCORES_PATH.exists():
        return {}
    try:
        return json.loads(SCORES_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_scores(scores: dict[str, object]) -> None:
    try:
        SCORES_PATH.write_text(json.dumps(scores, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except Exception:
        pass


@dataclass(frozen=True)
class GuessConfig:
    name: str
    lo: int
    hi: int
    tries: int


def game_guess_number() -> None:
    clear_screen()
    print(box(["规则：我会随机一个数字，你在限定次数内猜中即可。"], title="猜数字"))
    print()

    levels = [
        GuessConfig("简单", 1, 50, 8),
        GuessConfig("普通", 1, 100, 8),
        GuessConfig("困难", 1, 200, 7),
        GuessConfig("地狱", 1, 500, 7),
    ]
    for i, lvl in enumerate(levels, 1):
        print(f"{i}) {lvl.name}（范围 {lvl.lo}-{lvl.hi}，次数 {lvl.tries}）")
    print("0) 返回")
    choice = prompt_int("选择难度：", min_value=0, max_value=len(levels))
    if choice == 0:
        return

    config = levels[choice - 1]
    target = random.randint(config.lo, config.hi)
    used: list[int] = []
    start = time.perf_counter()
    narrowed_lo = config.lo
    narrowed_hi = config.hi

    for attempt in range(1, config.tries + 1):
        tries_left = config.tries - attempt + 1
        print()
        print(
            box(
                [
                    f"范围：{config.lo}-{config.hi}    建议范围：{narrowed_lo}-{narrowed_hi}",
                    f"剩余次数：{tries_left}",
                    f"已猜：{', '.join(map(str, used[-8:])) if used else '（无）'}",
                    "输入 0 返回（放弃本局）。",
                ],
                title="状态",
            )
        )
        guess = prompt_int_or_back(
            f"[{attempt}/{config.tries}] 请输入你的猜测：",
            min_value=config.lo,
            max_value=config.hi,
        )
        if guess is None:
            return
        used.append(guess)
        if guess == target:
            duration = time.perf_counter() - start
            print()
            print(
                box(
                    [
                        f"猜对了！答案是 {target}",
                        f"用时：{duration:.2f}s",
                        f"次数：{len(used)}",
                        f"记录：{', '.join(map(str, used))}",
                    ],
                    title="胜利",
                )
            )
            _record_best_guess_score(config, attempts=len(used), seconds=duration)
            pause()
            return
        if guess < target:
            print("太小了。")
            narrowed_lo = max(narrowed_lo, guess + 1)
        else:
            print("太大了。")
            narrowed_hi = min(narrowed_hi, guess - 1)
        print(f"位置：{guess} {gauge(guess, config.lo, config.hi)}")
        if narrowed_lo <= narrowed_hi:
            mid = (narrowed_lo + narrowed_hi) // 2
            print(f"建议范围中点：{mid} {gauge(mid, config.lo, config.hi)}")

    print()
    print(box([f"次数用完了！答案是 {target}。"], title="失败"))
    pause()


def _record_best_guess_score(config: GuessConfig, *, attempts: int, seconds: float) -> None:
    scores = load_scores()
    key = f"guess_number:{config.name}"
    existing = scores.get(key)
    current = {"attempts": attempts, "seconds": round(seconds, 3)}
    if not isinstance(existing, dict):
        scores[key] = current
        save_scores(scores)
        return
    try:
        best_attempts = int(existing.get("attempts"))
        best_seconds = float(existing.get("seconds"))
    except Exception:
        scores[key] = current
        save_scores(scores)
        return

    better = attempts < best_attempts or (attempts == best_attempts and seconds < best_seconds)
    if better:
        print("新纪录！")
        scores[key] = current
        save_scores(scores)


RPS = Literal["石头", "剪刀", "布"]


def game_rps() -> None:
    clear_screen()
    print(box(["输入 1/2/3 或 0 返回。"], title="石头剪刀布"))
    mapping: dict[int, RPS] = {1: "石头", 2: "剪刀", 3: "布"}
    win_against: dict[RPS, RPS] = {"石头": "剪刀", "剪刀": "布", "布": "石头"}

    scores = {"win": 0, "lose": 0, "draw": 0}
    history: list[str] = []
    while True:
        print()
        recent = history[-5:]
        recent_lines = ["最近对局："] + (recent if recent else ["（无）"])
        print(
            box(
                [
                    "1) 石头    2) 剪刀    3) 布",
                    "0) 返回",
                    f"战绩：胜 {scores['win']} / 负 {scores['lose']} / 平 {scores['draw']}",
                    *recent_lines,
                ],
                title="出拳",
            )
        )
        choice = prompt_int_or_back("你出什么：", min_value=0, max_value=3)
        if choice is None or choice == 0:
            return
        you = mapping[choice]
        bot: RPS = random.choice(list(mapping.values()))
        print()
        print(box([f"你：{you}", f"我：{bot}"], title="对局"))
        if you == bot:
            outcome = "平局"
            scores["draw"] += 1
        elif win_against[you] == bot:
            outcome = "你赢了"
            scores["win"] += 1
        else:
            outcome = "你输了"
            scores["lose"] += 1
        history.append(f"{you} vs {bot} → {outcome}")
        if len(history) > 6:
            history = history[-6:]
        print(box([outcome, f"当前战绩：胜 {scores['win']} / 负 {scores['lose']} / 平 {scores['draw']}"], title="结果"))


def game_reaction() -> None:
    clear_screen()
    print(
        box(
            ["规则：看到 GO! 之后立刻回车，越快越好。", "提示：提前按回车会算犯规。"],
            title="反应测试",
        )
    )
    print()

    rounds = prompt_int_or_back("要测几次（1-10，0 返回）：", min_value=0, max_value=10)
    if rounds is None or rounds == 0:
        return
    times: list[float] = []
    fouls = 0

    for i in range(1, rounds + 1):
        print()
        prompt(f"[{i}/{rounds}] 准备好了就回车开始...")
        wait = random.uniform(1.5, 4.0)
        print(box(["准备…", "等待 GO! 出现后立刻回车"], title="提示"))
        start = time.perf_counter()
        while time.perf_counter() - start < wait:
            time.sleep(0.01)

        print()
        print(box(["GO!"], title="现在"))
        t0 = time.perf_counter()
        try:
            input()
        except (EOFError, KeyboardInterrupt):
            print()
            raise SystemExit(0)
        dt = time.perf_counter() - t0
        if dt < 0.08:
            fouls += 1
            print(f"犯规（{dt*1000:.0f}ms）— 你可能在 GO! 前就按了。")
            continue
        times.append(dt)
        print(f"{dt*1000:.0f}ms")

    clear_screen()
    if times:
        best = min(times)
        avg = sum(times) / len(times)
        per_round = [f"第{i+1}次：{t*1000:.0f}ms" for i, t in enumerate(times[:8])]
        print(
            box(
                [
                    f"有效次数：{len(times)} / {rounds}",
                    f"犯规：{fouls}",
                    f"最快：{best*1000:.0f}ms",
                    f"平均：{avg*1000:.0f}ms",
                    *per_round,
                ],
                title="结果",
            )
        )
        _record_best_reaction(best_seconds=best)
    else:
        print(box([f"没有有效成绩（犯规 {fouls}）。"], title="结果"))
    pause()


def _record_best_reaction(*, best_seconds: float) -> None:
    scores = load_scores()
    key = "reaction:best_seconds"
    existing = scores.get(key)
    if isinstance(existing, (int, float)) and best_seconds >= float(existing):
        return
    scores[key] = round(best_seconds, 4)
    save_scores(scores)


def show_scores() -> None:
    clear_screen()
    scores = load_scores()
    if not scores:
        print(box(["暂无。"], title="本地记录"))
        pause()
        return
    lines = [f"{k}: {scores[k]}" for k in sorted(scores.keys())]
    lines.append("")
    lines.append(f"文件：{SCORES_PATH.name}")
    print(box(lines, title="本地记录"))
    pause()


def main(argv: list[str]) -> int:
    if len(argv) > 1 and argv[1] in {"-h", "--help"}:
        print("用法：python3 mini_game.py")
        return 0

    while True:
        clear_screen()
        print("\n".join(BANNER))
        print()
        print(
            box(
                [
                    "输入数字选择；任意时刻 Ctrl+C 退出。",
                    "1) 猜数字",
                    "2) 石头剪刀布",
                    "3) 反应测试",
                    "4) 查看记录",
                    "0) 退出",
                ],
                title="主菜单",
            )
        )
        choice = prompt_int("请选择：", min_value=0, max_value=4)
        if choice == 0:
            return 0
        if choice == 1:
            game_guess_number()
        elif choice == 2:
            game_rps()
        elif choice == 3:
            game_reaction()
        elif choice == 4:
            show_scores()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
