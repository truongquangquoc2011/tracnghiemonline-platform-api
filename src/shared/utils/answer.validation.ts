import { PrismaClient, AnswerShape } from '@prisma/client';
import { UnprocessableEntityException } from '@nestjs/common';

const ALLOWED_SHAPES: AnswerShape[] = [
  AnswerShape.triangle,
  AnswerShape.diamond,
  AnswerShape.circle,
  AnswerShape.square,
];

/**
 * Kiểm tra số lượng đáp án, trùng orderIndex và trùng shape trong cùng question.
 */
export async function validateAnswerLimitAndDuplicate(
  prisma: PrismaClient,
  questionId: string,
  orderIndex: number,
  shape: string,
) {
  //  Giới hạn tối đa 4 đáp án
  const total = await prisma.kahootAnswer.count({ where: { questionId } });
  if (total >= 4) {
    throw new UnprocessableEntityException({
      message: 'Chỉ được phép tối đa 4 đáp án cho mỗi câu hỏi.',
      path: 'answers',
    });
  }

  //  Kiểm tra orderIndex trùng
  const dupOrder = await prisma.kahootAnswer.findFirst({
    where: { questionId, orderIndex },
    select: { id: true },
  });
  if (dupOrder) {
    throw new UnprocessableEntityException({
      message: `orderIndex ${orderIndex} đã tồn tại cho câu hỏi này.`,
      path: 'orderIndex',
    });
  }

  //  Kiểm tra shape hợp lệ
  if (!ALLOWED_SHAPES.includes(shape as AnswerShape)) {
    throw new UnprocessableEntityException({
      message: `Shape '${shape}' không hợp lệ. Chỉ chấp nhận: ${ALLOWED_SHAPES.join(', ')}.`,
      path: 'shape',
    });
  }

  //  Kiểm tra shape trùng
  const dupShape = await prisma.kahootAnswer.findFirst({
    where: {
      questionId,
      shape: shape as AnswerShape,
    },
    select: { id: true },
  });
  if (dupShape) {
    throw new UnprocessableEntityException({
      message: `Shape '${shape}' đã được sử dụng trong câu hỏi này.`,
      path: 'shape',
    });
  }
}
