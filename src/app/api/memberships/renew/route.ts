import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addMonths, addYears, toDateString } from '@/lib/dateUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, plan_type, start_date, amount, mop } = body;

    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];

    let months_purchased = 1;
    if (plan_type === 'yearly') {
      months_purchased = 12;
    }

    // Check for current active membership that has not yet expired
    const activeMembership = await prisma.membership.findFirst({
      where: { member_id, status: 'active', end_date: { gte: todayStr } },
      orderBy: { end_date: 'desc' },
    });

    let membership_id: number;

    if (activeMembership) {
      // Renewed before expiring — extend the current membership
      const currentEnd = new Date(activeMembership.end_date! + 'T00:00:00');
      let newEnd: Date;
      if (plan_type === 'yearly') {
        newEnd = addYears(currentEnd, 1);
      } else {
        newEnd = addMonths(currentEnd, 1);
      }
      const new_end_date = toDateString(newEnd);
      const new_months = (activeMembership.months_purchased || 0) + months_purchased;

      await prisma.membership.update({
        where: { membership_id: activeMembership.membership_id },
        data: { end_date: new_end_date, months_purchased: new_months, plan_type },
      });

      membership_id = activeMembership.membership_id;

      if (amount) {
        await prisma.payment.create({
          data: {
            member_id,
            membership_id,
            amount: parseFloat(amount),
            mop,
            payment_date: todayStr,
            notes: `Membership extended — end date changed to ${new_end_date}`,
          },
        });
      }
    } else {
      // There is a gap or no active membership — create new membership record
      // Expire any old active memberships
      await prisma.membership.updateMany({
        where: { member_id, status: 'active' },
        data: { status: 'expired' },
      });

      const start = new Date(start_date || new Date());
      let end: Date;
      if (plan_type === 'yearly') {
        end = addYears(start, 1);
      } else {
        end = addMonths(start, 1);
      }
      const end_date = toDateString(end);
      const start_date_str = toDateString(start);

      const newMembership = await prisma.membership.create({
        data: {
          member_id,
          plan_type,
          start_date: start_date_str,
          end_date,
          months_purchased,
          status: 'active',
          created_at: now,
        },
      });

      membership_id = newMembership.membership_id;

      if (amount) {
        await prisma.payment.create({
          data: {
            member_id,
            membership_id,
            amount: parseFloat(amount),
            mop,
            payment_date: todayStr,
            notes: 'Membership renewal',
          },
        });
      }
    }

    return NextResponse.json({ success: true, membership_id });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to renew membership';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
