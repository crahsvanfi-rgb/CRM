import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error de base de datos';
    let code: string | undefined;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      code = exception.code;

      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Ya existe un registro con esos datos.';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'El tenant, usuario o registro relacionado no existe.';
      } else if (exception.code === 'P2023') {
        status = HttpStatus.BAD_REQUEST;
        message = 'El identificador de la cotizacion no tiene un formato valido.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro no encontrado.';
      } else if (exception.code === 'P2021' || exception.code === 'P2022') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'La base de datos no tiene el esquema requerido. Ejecuta las migraciones de Prisma.';
      }
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'No se pudo conectar a la base de datos. Revisa DATABASE_URL en Render.';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'La consulta enviada a la base de datos no es valida.';
    }

    console.error('Prisma error:', exception);
    response.status(status).json({ statusCode: status, message, code });
  }
}
