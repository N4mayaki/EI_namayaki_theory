import { ExponentialCost, FirstFreeCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { parseBigNumber, BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "namayaki_theory_1";
var name = "Namayaki Theory 1";
var description = "いったいなんなんだろうかこれは";
var authors = "Namayaki"; // ユーザーのアイデアに基づき作成
var version = 20; // マイルストーン（指数）を追加

var currency;
// アップグレード変数
var c1, c2, v1, d1, k; 
var q1, q2; // 確率計算用の変数
// マイルストーン変数
var c1Exp, c2Exp, q1Exp, q2Exp; // [追加] マイルストーン変数

// 理論の内部状態
var rhoDot; // 現在の $\dot{\rho}$ の値
var time;   // 最後のシミュレーションからの経過時間 (秒)

// 理論の固定値
var Vbr = 50; // ブレークダウン電圧
var Vbr_BN = BigNumber.from(Vbr); 
var tickTime = 0.1; // 1回のシミュレーションステップの時間 (秒)
var prob_const = BigNumber.from(100); // q1*q2 が 100 のとき p1=0.5

var init = () => {
    currency = theory.createCurrency();
    rhoDot = BigNumber.ZERO;
    time = 0;

    ///////////////////
    // Regular Upgrades

    // c1 (汎用乗数) - ID 0
    {
        let getDesc = (level) => "c_1=" + getC1(level).toString(0);
        c1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(1.18099)))); 
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
        c1.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation(); 
    }

    // c2 (指数乗数) - ID 1
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC2(level).toString(0);
        c2 = theory.createUpgrade(1, currency, new ExponentialCost(1e2, Math.log2(13.5))); 
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount)); 
        c2.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation(); 
    }

    // v1 (バイアス電圧) - ID 2
    {
        let getDesc = (level) => "v_1=" + getV1(level).toString(0);
        v1 = theory.createUpgrade(2, currency, new ExponentialCost(10, Math.log2(1.3))); 
        v1.getDescription = (_) => Utils.getMath(getDesc(v1.level));
        v1.getInfo = (amount) => Utils.getMathTo(getDesc(v1.level), getDesc(v1.level + amount));
        v1.maxLevel = 49; // Vbr - 1 = 49
        v1.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation(); 
    }
    // d1 (減衰係数) - ID 3
    {
        let getDesc = (level) => "d_1=" + getD1(level).toString(2); 
        d1 = theory.createUpgrade(3, currency, new ExponentialCost(50, Math.log2(10)));
        d1.getDescription = (_) => Utils.getMath(getDesc(d1.level));
        d1.getInfo = (amount) => Utils.getMathTo(getDesc(d1.level), getDesc(d1.level + amount));
        d1.maxLevel = 90;
        d1.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation(); 
    }

    // k (電離係数) - ID 4
    {
        let getDesc = (level) => "k=" + getK(level).toString(1); 
        k = theory.createUpgrade(4, currency, new ExponentialCost(1e2, Math.log2(1e2)));
        k.getDescription = (_) => Utils.getMath(getDesc(k.level));
        k.getInfo = (amount) => Utils.getMathTo(getDesc(k.level), getDesc(k.level + amount));
        k.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation(); 
    }

    // q1 (Stepwise) - ID 5
    {
        let getDesc = (level) => "q_1=" + getQ1(level).toString(0);
        q1 = theory.createUpgrade(5, currency, new FirstFreeCost(new ExponentialCost(1e10, Math.log2(1e13)))); 
        q1.getDescription = (_) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getDesc(q1.level), getDesc(q1.level + amount));
        q1.maxLevel = 20;
        q1.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation(); 
    }

    // q2 (Exponential, 2^n) - ID 6
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
        q2 = theory.createUpgrade(6, currency, new FirstFreeCost(new ExponentialCost(1e15, Math.log2(1e50))));
        q2.getDescription = (_) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount)); 
        q2.maxLevel = 10;
        q2.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation(); 
    }


    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e3);
    theory.createBuyAllUpgrade(1, currency, 1e3);
    theory.createAutoBuyerUpgrade(2, currency, 1e3);

    ///////////////////////
    //// Milestone Upgrades
    // [修正] コストを e10 ごとに変更
    theory.setMilestoneCost(new LinearCost(5, 15)); 

    // [追加] 4つの指数マイルストーン
    {
        c1Exp = theory.createMilestoneUpgrade(0, 1);
        c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.2");
        c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.2");
        c1Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }
    {
        c2Exp = theory.createMilestoneUpgrade(1, 1);
        c2Exp.description = Localization.getUpgradeIncCustomExpDesc("c_2", "0.2");
        c2Exp.info = Localization.getUpgradeIncCustomExpInfo("c_2", "0.2");
        c2Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }
    {
        IpExp = theory.createMilestoneUpgrade(2, 2);
        IpExp.description = Localization.getUpgradeIncCustomExpDesc("I_{pulse}", "0.1");
        IpExp.info = Localization.getUpgradeIncCustomExpInfo("I_{pulse}", "0.1");
        IpExp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
    }

    ///////////////////
    //// Story chapters
    chapter1 = theory.createStoryChapter(0, "これは何だ", "この理論は何なのか\n果たしてゲームバランスは大丈夫なのか\nバグは潜んでいないのか\n今は何もわからない\n\n面白くないことに時間を費やす準備はいいか？", () => c1.level > 0);
    chapter2 = theory.createStoryChapter(1, "光あれ", "ここまで無駄にした時間は何分だ？\nこれが罠だと気づいたか？\n\n君たちがこれをやっている間、私は公式のカスタム理論を進める\nそのためにこの世界を創造したのだから", () => q1.level > 1);
    chapter3 = theory.createStoryChapter(2, "世界の終わり", "この場所が\nこの世の終わりと\n悟れども\n最後に一言\nはっぴーまんこ", () => c1.level > 10000);
    // [追加] マイルストーンのアンロック順序
    updateAvailability();
}




// [追加] マイルストーンのアンロック順序を管理
var updateAvailability = () => {
}

var tick = (elapsedTime, multiplier) => {
    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;
    currency.value += rhoDot * dt * bonus;

    // [修正] 指数を適用
    let v_c1 = getC1(c1.level).pow(getC1Exponent(c1Exp.level));
    let v_c2 = getC2(c2.level).pow(getC2Exponent(c2Exp.level)); 
    let v_v1 = getV1(v1.level);
    let d1_tick = getD1(d1.level); 
    let v_k = getK(k.level); 
    
    // [修正] 指数を適用
    let v_q1 = getQ1(q1.level)
    let v_q2 = getQ2(q2.level)
    let q_prod = v_q1 * v_q2; // q1*q2
    let p1_prob = q_prod / (q_prod + prob_const);

    if (v_v1 >= Vbr_BN) {
        v_v1 = Vbr_BN * BigNumber.from(0.99999999);
    }

    let M;
    let ratio = v_v1 / Vbr_BN;
    let base = BigNumber.ONE - ratio; 
    let denominator = base.pow(v_k);  
    
    if (denominator.sign <= 0) {
        M = BigNumber.from(1e308); 
    } else {
        M = BigNumber.ONE / denominator;
    }

    let I_pulse_value = M * v_c1 * v_c2; 

    let f_h_cont = rhoDot - BigNumber.from(1e300) * BigNumber.from(1e300);
    let f_h_value = BigNumber.ONE / (BigNumber.ONE + f_h_cont.exp());

    time += elapsedTime * multiplier;

    while (time >= tickTime) {
        
        if (Math.random() < p1_prob.toNumber()) {
            rhoDot = (rhoDot * d1_tick) + I_pulse_value.pow(getIpExponent(IpExp.level)) * f_h_value;;
        } else {
            rhoDot = rhoDot * d1_tick;
        }

        time -= tickTime;
    }
    
    theory.invalidateTertiaryEquation(); 
}


var getPrimaryEquation = () => {

    
    // [修正] LaTeX に指数表記を追加
    let getExpStr1 = (level) => {
        if (level == 1) return "^{1.1}";
        if (level == 2) return "^{1.2}";
        if (level == 3) return "^{1.3}";
        if (level == 4) return "^{1.4}";
        if (level == 5) return "^{1.5}";
        return "";
    }
    let getExpStr2 = (level) => {
        if (level == 1) return "^{1.2}";
        if (level == 2) return "^{1.4}";
        return "";
    }

    let c1_exp = getExpStr2(c1Exp.level);
    let c2_exp = getExpStr2(c2Exp.level);
    let Ip_exp = getExpStr1(IpExp.level);


    let eq1 = `\\dot{\\rho}_{t} = (\\dot{\\rho}_{t-1} \\times d_1) + I_{pulse}${Ip_exp} f_{h} \\quad (\\dot{\\rho}_{0} = 0)`;
    let eq2 = `I_{pulse} = \\begin{cases} M \\times c_1${c1_exp} c_2${c2_exp} & (\\text{probability } p_1) \\\\ 0 & (\\text{otherwise}) \\end{cases}`;
    let eq3 = `M = \\frac{1}{(1 - v_1 / ${Vbr})^k}`; 
    
    // [修正] LaTeX に指数表記を追加
    let v_q1 = getQ1(q1.level)
    let v_q2 = getQ2(q2.level)
    let q_prod = v_q1 * v_q2;
    let p1_prob_val = q_prod / (q_prod + prob_const);
    let C = prob_const.toString(0);

    let eq4 = `p_1 = \\frac{q_1 q_2}{q_1 q_2 + ${C}} = ${p1_prob_val.toString(3)}`;
    let eq5 = `f_{h} = \\frac{1}{1+\\exp(\\dot{\\rho}_{t-1} - H)}`;

    theory.primaryEquationHeight = 160; 
    return `\\begin{matrix} ${eq1} \\\\ \\\\ ${eq2} \\\\ \\\\ ${eq3} \\quad ${eq4} \\\\ \\\\ ${eq5} \\end{matrix}`; 
}

var getSecondaryEquation = () => theory.latexSymbol + "=\\max\\rho";
var getTertiaryEquation = () => "\\dot{\\rho}=" + rhoDot.toString(2); 

var getPublicationMultiplier = (tau) => tau.pow(0.15) / BigNumber.THREE; 
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.15}}{3}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

// STATE
var getInternalState = () => `${rhoDot} ${time}`;

var setInternalState = (state) => {
    let values = state.split(" ");
    if (values.length > 0) rhoDot = parseBigNumber(values[0]);
    if (values.length > 1) time = parseFloat(values[1]);
}

var postPublish = () => {
    rhoDot = BigNumber.ZERO;
    time = 0;
    theory.invalidateTertiaryEquation();
}

// GETTERS
var getC1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 100);
var getC2 = (level) => BigNumber.TWO.pow(level);
var getV1 = (level) => BigNumber.from(level);
var getD1 = (level) => BigNumber.from(level * 0.01);
var getK = (level) => BigNumber.from(1 + level * 0.1); // 1, 2, 3 ...

var getQ1 = (level) => {
  if (level == 0) return BigNumber.ZERO;
  return Utils.getStepwisePowerSum(level, 2, 10, 5);
};
var getQ2 = (level) => BigNumber.TWO.pow(level);

// [追加] マイルストーン用のゲッター
var getC1Exponent = (level) => BigNumber.from(1 + 0.2 * level);
var getC2Exponent = (level) => BigNumber.from(1 + 0.2 * level);
var getIpExponent = (level) => BigNumber.from(1 + 0.1 * level);


init();