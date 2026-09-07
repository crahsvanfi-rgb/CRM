import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { TemplatesService } from './templates.service.js';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Templates (Campañas)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva plantilla' })
  create(@Req() req: any, @Body() createTemplateDto: CreateTemplateDto) {
    const role = (req.user?.role?.name || req.user?.role || '').toLowerCase();
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden crear plantillas');
    }
    return this.templatesService.create(req.user.tenantId, createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las plantillas' })
  findAll(@Req() req: any) {
    return this.templatesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.templatesService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar plantilla' })
  update(@Req() req: any, @Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    const role = (req.user?.role?.name || req.user?.role || '').toLowerCase();
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden modificar plantillas');
    }
    return this.templatesService.update(req.user.tenantId, id, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plantilla' })
  remove(@Req() req: any, @Param('id') id: string) {
    const role = (req.user?.role?.name || req.user?.role || '').toLowerCase();
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden eliminar plantillas');
    }
    return this.templatesService.remove(req.user.tenantId, id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar plantilla' })
  duplicate(@Req() req: any, @Param('id') id: string) {
    const role = (req.user?.role?.name || req.user?.role || '').toLowerCase();
    if (role === 'user' || role === 'basico' || role === 'lector') {
      throw new ForbiddenException('Los usuarios con rol básico no pueden duplicar plantillas');
    }
    return this.templatesService.duplicate(req.user.tenantId, id);
  }
}

