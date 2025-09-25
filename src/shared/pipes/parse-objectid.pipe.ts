import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { InvalidObjectIdException } from 'src/shared/constants/common-error.constant';

// Regex của Mongo ObjectId: 24 ký tự hex
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any> {
  transform(value: any, metadata: ArgumentMetadata) {
    // Only check if the parameter name contains 'id' or 'Id'.
    if (metadata.type === 'param' && /id$/i.test(metadata.data || '')) {
      if (!objectIdRegex.test(value)) {
        throw InvalidObjectIdException;
      }
    }
    return value;
  }
}
