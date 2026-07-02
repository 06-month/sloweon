import "server-only";
import { prisma } from "./db";

export async function getPointBalance(userId: string): Promise<number> {
  const agg = await prisma.pointLedger.aggregate({ where: { userId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

/** 배송 완료 시 적립율 (finalAmount 기준) */
export const POINT_EARN_RATE = 0.01;
