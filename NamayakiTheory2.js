import { FreeCost, CustomCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "namayaki_theory_2";
var name = "Namayaki Theory 2";
var description = "難しそうで、意外と簡単、\nと思ったらやっぱ難しい？\n\n目標: ρ = 1e14 に到達せよ";
var authors = "Namayaki";
var version = 1;

var currency;
var a, b, c;
var time = BigNumber.ZERO;
var lemmaComplete;
var hasReset = false;
var hasStarted = false; // t カウント開始フラグ

var chapter1, chapter2, chapter3;

var init = () => {
    currency = theory.createCurrency();

    ///////////////////
    // Regular Upgrades

    // a parameter (Free to adjust)
    {
        let getDesc = (level) => "a=" + level;
        let getInfo = (level) => "a=" + level;
        a = theory.createUpgrade(0, currency, new FreeCost());
        a.getDescription = (_) => Utils.getMath(getDesc(a.level));
        a.getInfo = (amount) => Utils.getMathTo(getInfo(a.level), getInfo(a.level + amount));
        a.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    // b parameter (Free to adjust)
    {
        let getDesc = (level) => "b=" + level;
        let getInfo = (level) => "b=" + level;
        b = theory.createUpgrade(1, currency, new FreeCost());
        b.getDescription = (_) => Utils.getMath(getDesc(b.level));
        b.getInfo = (amount) => Utils.getMathTo(getInfo(b.level), getInfo(b.level + amount));
        b.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    // c parameter (Free to adjust)
    {
        let getDesc = (level) => "c=" + level;
        let getInfo = (level) => "c=" + level;
        c = theory.createUpgrade(2, currency, new FreeCost());
        c.getDescription = (_) => Utils.getMath(getDesc(c.level));
        c.getInfo = (amount) => Utils.getMathTo(getInfo(c.level), getInfo(c.level + amount));
        c.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    /////////////////////
    // Permanent Upgrades
    // (Singular Upgrade に変更)
    
    // Lemma completion upgrade
    {
        let lemmaCost = new CustomCost((level) => {
            if (level == 0) return BigNumber.from(1e14);
            return BigNumber.from(1e100); // Already bought
        });
        
        // PermanentUpgrade から SingularUpgrade に変更
        lemmaComplete = theory.createSingularUpgrade(0, currency, lemmaCost);
        lemmaComplete.getDescription = (_) => "Namayaki Theory 2を証明する";
        lemmaComplete.getInfo = (_) => "Namayaki Theory 2を証明する";
        lemmaComplete.maxLevel = 1;
        lemmaComplete.bought = (_) => {
            theory.invalidateTertiaryEquation();
        };
    }

    ///////////////////
    //// Story chapters    
    chapter1 = theory.createStoryChapter(0, "何度だってやり直せる", 
        "初見クリアできなくて悔しいって？\n" +
        "大丈夫、失敗は既定路線だ\n" +
        "針の穴を通すような繊細な問題だ\n" +
        "果たしてたどり着けるだろうか？\n\n" +
        "クリアできたら、\n" +
        "君にこの世の真理をひとつ教えよう",
        () => hasReset);
    
    chapter2 = theory.createStoryChapter(1, "この世の真理", 
        "おめでとう！\n" +
        "ここにたどり着くとは素晴らしい\n" +
        "褒美だ\n" +
        "今回気付いたこの世の真理を教えよう\n\n" +
        "「コーディングは\n" +
        "ChatGPTやGeminiより\n" +
        "Claudeだ」\n" +
        "Namayaki Theory 2、証明終了", 
        () => lemmaComplete.level > 0);
}

var tick = (elapsedTime, multiplier) => {
    let dt = BigNumber.from(elapsedTime * multiplier);

    // 最初の変数が購入されるまで t を開始しない
    if (!hasStarted) {
        if (a.level > 0 || b.level > 0 || c.level > 0) {
            hasStarted = true; // カウント開始
        } else {
            theory.invalidateTertiaryEquation(); // t=0 を表示し続ける
            return; // t も ρ も増加させない
        }
    }
    
    // 既に180に達しているかチェック
    if (time >= BigNumber.from(180)) {
        time = BigNumber.from(180); // 念のため180に固定
        theory.invalidateTertiaryEquation(); // tの表示を更新
        return; // ρドットは0、tも増加しない
    }

    // このtickで180を超えるか？
    let nextTime = time + dt;
    let effectiveDt = dt;

    if (nextTime > BigNumber.from(180)) {
        effectiveDt = BigNumber.from(180) - time; // 180までの残り時間
        time = BigNumber.from(180); // timeを180にクランプ
    } else {
        time = nextTime; // 180を超えないならそのまま更新
    }

    if (effectiveDt < BigNumber.ZERO) {
         effectiveDt = BigNumber.ZERO;
    }
    
    let aVal = BigNumber.from(a.level);
    let bVal = BigNumber.from(b.level);
    let cVal = BigNumber.from(c.level);
    
    // Calculate resonance coefficient: sin²(πa/10) × sin²(πb/15) × sin²(πc/20)
    let sinA = Math.sin(Math.PI * a.level / 10.0);
    let sinB = Math.sin(Math.PI * b.level / 15.0);
    let sinC = Math.sin(Math.PI * c.level / 20.0);
    
    let resonance = BigNumber.from(sinA * sinA * sinB * sinB * sinC * sinC);
    
    // Complex interaction terms
    // Optimal around: a≈15, b≈7.5, c≈10
    let term1 = (aVal + bVal * BigNumber.THREE).pow(0.5);
    let term2 = (bVal * BigNumber.TWO + cVal).pow(0.4);
    let term3 = (aVal - cVal / BigNumber.TWO + BigNumber.from(5)).pow(0.3);
    
    // ρ̇ = 10^6 × t² × (a+3b)^0.5 × (2b+c)^0.4 × (a-c/2+5)^0.3 × R(a,b,c)
    currency.value += effectiveDt * 1.02 * BigNumber.from(1e6) * time.pow(2) * term1 * term2 * term3 * resonance;
    
    theory.invalidateTertiaryEquation();
}

var getPrimaryEquation = () => {
    theory.primaryEquationHeight = 110;
    let result = "\\begin{matrix}";
    result += "\\\\ \\dot{\\rho} = 10^6 \\cdot t^2 \\cdot A \\cdot R(a,b,c) \\\\";
    result += "\\\\ A = (a+3b)^{0.5}(2b+c)^{0.4}(a-\\frac{c}{2}+5)^{0.3} \\\\";
    result += "\\\\ R(a,b,c) = \\sin^2\\left(\\frac{\\pi a}{10}\\right) \\sin^2\\left(\\frac{\\pi b}{15}\\right) \\sin^2\\left(\\frac{\\pi c}{20}\\right)";
    result += "\\end{matrix}";
    return result;
}

var getSecondaryEquation = () => {
    return "\\text{Timelimit: }t=180,\\ \\ \\text{Goal: } \\rho \\geq 1e14";
}

var getTertiaryEquation = () => {
    return "t=" + time.toString(2);
}

var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getInternalState = () => {
    // hasStarted を state に追加
    return time.toString() + " " + a.level + " " + b.level + " " + c.level + " " + (hasReset ? "1" : "0") + " " + (hasStarted ? "1" : "0");
}

var setInternalState = (state) => {
    let values = state.split(" ");
    if (values.length > 0) time = BigNumber.from(values[0]);
    if (values.length > 1) a.level = parseInt(values[1]);
    if (values.length > 2) b.level = parseInt(values[2]);
    if (values.length > 3) c.level = parseInt(values[3]);
    if (values.length > 4) hasReset = values[4] === "1";
    if (values.length > 5) hasStarted = values[5] === "1"; // hasStarted を復元
}

var canResetStage = () => true;
var getResetStageMessage = () => "リセットしますか？";
var resetStage = () => {
    hasReset = true;
    hasStarted = false; // hasStarted をリセット
    a.level = 0;
    b.level = 0;
    c.level = 0;
    currency.value = BigNumber.ZERO;
    time = BigNumber.ZERO;
    theory.clearGraph();
}

init();