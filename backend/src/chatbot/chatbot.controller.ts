import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Chatbot')
@Controller('chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('query')
  @ApiOperation({ summary: 'Enviar una consulta al chatbot de IA' })
  async query(@Body() chatRequestDto: ChatRequestDto) {
    const response = await this.chatbotService.chat(
      chatRequestDto.message,
      chatRequestDto.history,
    );
    return { response };
  }
}
