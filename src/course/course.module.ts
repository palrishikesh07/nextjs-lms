import { Module } from '@nestjs/common';
import { CourseService } from './course.service.js';
import { CourseController } from './course.controller.js';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseSchema } from './schemas/course.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Course', schema: CourseSchema}])
  ],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
