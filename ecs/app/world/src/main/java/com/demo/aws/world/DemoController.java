package com.demo.aws.world;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
public class DemoController {
    
    private static final Logger logger = LoggerFactory.getLogger(DemoController.class);
    
    @GetMapping
    public String sayWorld(){
        logger.info("World service called");
        return "World";
    }
}
