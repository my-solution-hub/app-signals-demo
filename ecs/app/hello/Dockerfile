ARG PLATFORM
FROM --platform=linux/${PLATFORM} amazoncorretto:17

COPY ./target/hello.jar /app/demo.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/demo.jar"]