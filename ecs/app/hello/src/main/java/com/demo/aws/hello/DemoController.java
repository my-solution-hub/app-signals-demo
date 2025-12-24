package com.demo.aws.hello;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;


@RestController
public class DemoController {
    
    private static final Logger logger = LoggerFactory.getLogger(DemoController.class);
    private final WebClient webClient;
    
    @Value("${WORLD_SERVICE_URL:http://localhost:8081}")
    private String worldServiceUrl;
    
    public DemoController() {
        this.webClient = WebClient.builder().build();
    }
    
    @GetMapping
    public String sayHello(){
        logger.info("Hello service called, calling world service at: {}", worldServiceUrl);
        try {
            String worldResponse = webClient.get()
                .uri(worldServiceUrl)
                .retrieve()
                .bodyToMono(String.class)
                .block();
            logger.info("Received response from world service: {}", worldResponse);
            return "Hello " + worldResponse;
        } catch (Exception e) {
            logger.error("Failed to call world service: {}", e.getMessage());
            return "Hello (world service unavailable)";
        }
    }
}
