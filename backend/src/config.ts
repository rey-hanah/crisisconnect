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
  OPENAI_API_KEY: string = '';

  @IsString()
  GEMINI_API_KEY: string = '';

  @IsString()
  ELEVENLABS_API_KEY: string = '';

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
    const missingVars = errors
      .map(err => {
        const constraints = Object.values(err.constraints || {});
        return `  - ${err.property}: ${constraints.join(', ')}`;
      })
      .join('\n');
    
    throw new Error(
      `Environment validation failed. Please check your .env file:\n${missingVars}\n\n` +
      `Required variables: MONGODB_URI, JWT_SECRET\n` +
      `Optional variables: OPENAI_API_KEY, GEMINI_API_KEY, ELEVENLABS_API_KEY, CLIENT_URL, PORT`
    );
  }

  return validatedConfig;
}
