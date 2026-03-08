import { plainToInstance, Type } from 'class-transformer';
import { IsString, IsNumber, ValidateNested, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  @Type(() => Number)
  PORT: number = 3001;

  @IsString()
  MONGODB_URI: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  OPENAI_API_KEY: string;

  @IsString()
  CLIENT_URL: string = 'http://localhost:5173';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
