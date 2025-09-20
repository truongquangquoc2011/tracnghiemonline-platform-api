import { Injectable } from '@nestjs/common'
import { hash, compare } from 'bcrypt'
import { envConfig } from '../config'

@Injectable()
export class HashingService {
  hashPassword(password: string): Promise<string> {
    return hash(password, envConfig.saltRounds)
  }

  comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword)
  }
}
