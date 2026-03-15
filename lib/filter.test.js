import { calcDiscountRate, classifyGrade, calcMarketAvg } from "./filter";

// 할인율 계산 테스트
const price = 168000;      // 1억 6800만
const marketAvg = 215000;  // 2억 1500만
const rate = calcDiscountRate(price, marketAvg);
console.log(`할인율: ${rate}%`);           // 예상: 21.9%
console.log(`등급: ${classifyGrade(rate)}`); // 예상: 초급매

// 할인율 0% 테스트
console.log(classifyGrade(3));   // 일반
console.log(classifyGrade(8));   // 저평가
console.log(classifyGrade(15));  // 급매
console.log(classifyGrade(22));  // 초급매